import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "./supabase/admin";
import { googleBusy } from "./google";
import { TZ } from "./env";
import { monthRange, slotsForDate, slotsForMonth, type Interval, type SlotOptions } from "./slots";
import type { AvailabilityRule, GroupSession, LessonType, Settings } from "./types";

/**
 * Cache tags for data that rarely changes. Reads are served from Next's data cache so page
 * navigations don't wait on Supabase; every write path must call revalidateTag() with the matching tag.
 */
export const TAGS = {
  settings: "settings",
  lessons: "lesson-types",
  availability: "availability-rules",
  groups: "group-sessions",
} as const;

const cachedSettings = unstable_cache(
  async () => {
    const { data, error } = await db().from("settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as Settings;
  },
  ["settings"],
  { tags: [TAGS.settings], revalidate: 3600 },
);
export const getSettings = cache((): Promise<Settings> => cachedSettings());

const cachedActiveLessons = unstable_cache(
  async () => {
    const { data } = await db().from("lesson_types").select("*").eq("active", true).order("sort_order");
    return (data ?? []) as LessonType[];
  },
  ["active-lesson-types"],
  { tags: [TAGS.lessons], revalidate: 3600 },
);
export const activeLessonTypes = cache(() => cachedActiveLessons());

const cachedAvailabilityRules = unstable_cache(
  async () => {
    const { data } = await db().from("availability_rules").select("weekday, start_time, end_time");
    return (data ?? []) as AvailabilityRule[];
  },
  ["availability-rules"],
  { tags: [TAGS.availability], revalidate: 3600 },
);

// Scheduled sessions from now on; callers filter out ones that have since started.
const cachedScheduledSessions = unstable_cache(
  async () => {
    const { data } = await db()
      .from("group_sessions")
      .select("*")
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at");
    return (data ?? []) as GroupSession[];
  },
  ["scheduled-group-sessions"],
  { tags: [TAGS.groups], revalidate: 300 },
);

export async function getLessonType(id: string): Promise<LessonType | null> {
  return (await activeLessonTypes()).find((l) => l.id === id) ?? null;
}

/** Everything that blocks a private lesson within a time range. */
export async function busyIntervals(
  range: Interval,
  opts: { includeGoogle?: boolean; expireStale?: boolean } = {},
): Promise<Interval[]> {
  const from = range.start.toISOString();
  const to = range.end.toISOString();
  // Before inserting a booking, stale holds must really be expired (the overlap constraint counts every
  // pending row). For just listing availability, ignoring them in the query saves a round trip.
  if (opts.expireStale) await db().rpc("expire_stale_pending");
  const holdCutoff = new Date(Date.now() - 20 * 60_000).toISOString();

  const [bookings, sessions, blocked, google] = await Promise.all([
    db()
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("kind", "private")
      .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${holdCutoff})`)
      .lt("starts_at", to)
      .gt("ends_at", from),
    db()
      .from("group_sessions")
      .select("starts_at, ends_at")
      .eq("status", "scheduled")
      .lt("starts_at", to)
      .gt("ends_at", from),
    db().from("blocked_periods").select("starts_at, ends_at").lt("starts_at", to).gt("ends_at", from),
    opts.includeGoogle === false ? Promise.resolve([] as Interval[]) : googleBusy(range),
  ]);

  const toIv = (rows: { starts_at: string; ends_at: string }[] | null) =>
    (rows ?? []).map((r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) }));

  return [
    ...toIv(bookings.data as never),
    ...toIv(sessions.data as never),
    ...toIv(blocked.data as never),
    ...(google as Interval[]),
  ];
}

async function slotOptions(lesson: LessonType, busy: Interval[]): Promise<SlotOptions> {
  const [settings, rules] = await Promise.all([getSettings(), cachedAvailabilityRules()]);
  return {
    rules,
    busy,
    durationMinutes: lesson.duration_minutes,
    intervalMinutes: settings.slot_interval_minutes,
    bufferMinutes: settings.buffer_minutes,
    minNoticeHours: settings.min_notice_hours,
    horizonDays: settings.booking_horizon_days,
    now: new Date(),
    timeZone: TZ,
  };
}

export async function availableSlotsForMonth(lesson: LessonType, month: string) {
  const range = monthRange(month, TZ);
  const busy = await busyIntervals(range);
  return slotsForMonth(month, await slotOptions(lesson, busy));
}

/** Re-check a single requested start time right before booking. */
export async function isSlotAvailable(lesson: LessonType, startIso: string): Promise<boolean> {
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return false;
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(start); // YYYY-MM-DD
  const range = { start: new Date(start.getTime() - 86_400_000), end: new Date(start.getTime() + 2 * 86_400_000) };
  const busy = await busyIntervals(range, { expireStale: true });
  const slots = slotsForDate(localDate, await slotOptions(lesson, busy));
  return slots.some((s) => s.start === start.toISOString());
}

/** Upcoming scheduled sessions without spot counts (served from cache). */
export const scheduledGroupSessions = cache(async (): Promise<GroupSession[]> => {
  const now = new Date();
  return (await cachedScheduledSessions()).filter((s) => new Date(s.starts_at) > now);
});

export async function upcomingGroupSessions(): Promise<(GroupSession & { spots_left: number })[]> {
  // Spots are always live; group_session_taken already ignores pending holds older than 20 minutes.
  return withSpotsLeft(await scheduledGroupSessions());
}

export async function withSpotsLeft(sessions: GroupSession[]) {
  if (!sessions.length) return [];
  const { data: taken } = await db().rpc("group_session_taken", { p_session_ids: sessions.map((s) => s.id) });
  const map = new Map<string, number>(
    ((taken ?? []) as { group_session_id: string; taken: number }[]).map((t) => [t.group_session_id, Number(t.taken)]),
  );
  return sessions.map((s) => ({ ...s, spots_left: Math.max(0, s.capacity - (map.get(s.id) ?? 0)) }));
}
