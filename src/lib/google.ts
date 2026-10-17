import "server-only";
import { db } from "./supabase/admin";
import { googleConfigured, siteUrl, TZ } from "./env";
import type { Interval } from "./slots";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "openid",
  "email",
];

export function redirectUri() {
  return `${siteUrl()}/api/google/callback`;
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${json.error_description || json.error}`);
  let email: string | null = null;
  if (json.id_token) {
    try {
      email = JSON.parse(Buffer.from(json.id_token.split(".")[1], "base64url").toString()).email ?? null;
    } catch {}
  }
  return { refreshToken: json.refresh_token as string | undefined, email };
}

let tokenCache: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (!googleConfigured()) return null;
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) return tokenCache.token;
  const { data } = await db().from("google_auth").select("refresh_token").eq("id", 1).maybeSingle();
  const refresh = (data as { refresh_token?: string } | null)?.refresh_token;
  if (!refresh) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Google token refresh failed", json);
    return null;
  }
  tokenCache = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return tokenCache.token;
}

export function clearTokenCache() {
  tokenCache = null;
}

async function calendarId(): Promise<string> {
  const { data } = await db().from("settings").select("google_calendar_id").eq("id", 1).single();
  return (data as { google_calendar_id?: string } | null)?.google_calendar_id || "primary";
}

/** Busy times from Google Calendar. Returns [] when not connected or on error. */
export async function googleBusy(range: Interval): Promise<Interval[]> {
  try {
    const token = await accessToken();
    if (!token) return [];
    const id = await calendarId();
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
        timeZone: TZ,
        items: [{ id }],
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Google freeBusy failed", json);
      return [];
    }
    const busy = json.calendars?.[id]?.busy ?? [];
    return busy.map((b: { start: string; end: string }) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (e) {
    console.error("Google freeBusy error", e);
    return [];
  }
}

export async function createEvent(ev: {
  summary: string;
  description: string;
  location: string;
  start: string;
  end: string;
  appEventId?: string;
}): Promise<string | null> {
  try {
    const token = await accessToken();
    if (!token) return null;
    const id = await calendarId();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: ev.summary,
        description: ev.description,
        location: ev.location,
        start: { dateTime: ev.start, timeZone: TZ },
        end: { dateTime: ev.end, timeZone: TZ },
        extendedProperties: { private: { fullSwingId: ev.appEventId ?? "" } },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Google create event failed", json);
      return null;
    }
    return json.id as string;
  } catch (e) {
    console.error("Google create event error", e);
    return null;
  }
}

export async function deleteEvent(eventId: string | null | undefined): Promise<void> {
  if (!eventId) return;
  try {
    const token = await accessToken();
    if (!token) return;
    const id = await calendarId();
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (e) {
    console.error("Google delete event error", e);
  }
}

/** Link the client can use to add a lesson to their own Google Calendar. */
export function addToGoogleCalendarLink(title: string, start: string, end: string, location: string, details: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${f(start)}/${f(end)}`,
    location,
    details,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
