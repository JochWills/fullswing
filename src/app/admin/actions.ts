"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/lib/data";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { TZ } from "@/lib/env";
import { cancelBooking, rescheduleBooking, rescheduleGroupSession } from "@/lib/bookings";
import { createEvent, deleteEvent } from "@/lib/google";
import { getSettings } from "@/lib/data";
import type { Booking, GroupSession } from "@/lib/types";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => Math.round(Number(f.get(k) ?? 0));
const cents = (f: FormData, k: string) => Math.round(Number(String(f.get(k) ?? "0").replace(",", ".")) * 100);
const localToUtc = (date: string, time: string) => fromZonedTime(`${date}T${time}:00`, TZ);

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ------------------------------------------------------------------ Settings
export async function saveSettings(f: FormData) {
  await requireAdmin();
  const { error } = await db()
    .from("settings")
    .update({
      venue_name: str(f, "venue_name"),
      venue_address: str(f, "venue_address"),
      contact_email: str(f, "contact_email") || null,
      contact_phone: str(f, "contact_phone") || null,
      cancellation_hours: int(f, "cancellation_hours"),
      min_notice_hours: int(f, "min_notice_hours"),
      booking_horizon_days: int(f, "booking_horizon_days"),
      slot_interval_minutes: int(f, "slot_interval_minutes"),
      buffer_minutes: int(f, "buffer_minutes"),
      google_calendar_id: str(f, "google_calendar_id") || "primary",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) fail("/admin/settings", error.message);
  revalidateTag(TAGS.settings);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

// ------------------------------------------------------------------ Availability
export async function addRule(f: FormData) {
  await requireAdmin();
  const days = f.getAll("weekday").map(Number);
  const start = str(f, "start_time");
  const end = str(f, "end_time");
  if (!days.length) fail("/admin/availability", "Pick at least one day.");
  if (!start || !end || end <= start) fail("/admin/availability", "End time must be after start time.");
  const { error } = await db()
    .from("availability_rules")
    .insert(days.map((weekday) => ({ weekday, start_time: start, end_time: end })));
  if (error) fail("/admin/availability", error.message);
  revalidateTag(TAGS.availability);
  revalidatePath("/admin/availability");
}

export async function deleteRule(f: FormData) {
  await requireAdmin();
  await db().from("availability_rules").delete().eq("id", str(f, "id"));
  revalidateTag(TAGS.availability);
  revalidatePath("/admin/availability");
}

export async function addBlocked(f: FormData) {
  await requireAdmin();
  const from = str(f, "from_date");
  const to = str(f, "to_date") || from;
  const allDay = f.get("all_day") === "on";
  if (!from) fail("/admin/availability", "Pick a date to block.");
  const start = localToUtc(from, allDay ? "00:00" : str(f, "from_time") || "00:00");
  const end = allDay
    ? new Date(localToUtc(to, "00:00").getTime() + 86_400_000)
    : localToUtc(to, str(f, "to_time") || "23:59");
  if (end <= start) fail("/admin/availability", "The end of the blocked period must be after the start.");
  const { error } = await db()
    .from("blocked_periods")
    .insert({ starts_at: start.toISOString(), ends_at: end.toISOString(), reason: str(f, "reason") || null });
  if (error) fail("/admin/availability", error.message);
  revalidatePath("/admin/availability");
}

export async function deleteBlocked(f: FormData) {
  await requireAdmin();
  await db().from("blocked_periods").delete().eq("id", str(f, "id"));
  revalidatePath("/admin/availability");
}

// ------------------------------------------------------------------ Lesson types
export async function saveLessonType(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const row = {
    name: str(f, "name"),
    description: str(f, "description") || null,
    duration_minutes: int(f, "duration_minutes"),
    price_cents: cents(f, "price"),
    sort_order: int(f, "sort_order"),
    active: f.get("active") === "on",
  };
  if (!row.name) fail("/admin/lessons", "Name is required.");
  if (row.duration_minutes < 15) fail("/admin/lessons", "Duration must be at least 15 minutes.");
  const { error } = id
    ? await db().from("lesson_types").update(row).eq("id", id)
    : await db().from("lesson_types").insert(row);
  if (error) fail("/admin/lessons", error.message);
  revalidateTag(TAGS.lessons);
  revalidatePath("/admin/lessons");
  revalidatePath("/book");
  redirect("/admin/lessons?saved=1");
}

export async function deleteLessonType(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const { error } = await db().from("lesson_types").delete().eq("id", id);
  if (error) {
    // Has bookings - hide it instead so history is kept.
    await db().from("lesson_types").update({ active: false }).eq("id", id);
    revalidateTag(TAGS.lessons);
    revalidatePath("/admin/lessons");
    redirect("/admin/lessons?error=" + encodeURIComponent("This lesson type has bookings, so it was hidden instead of deleted."));
  }
  revalidateTag(TAGS.lessons);
  revalidatePath("/admin/lessons");
}

// ------------------------------------------------------------------ Group sessions
export async function createGroupSession(f: FormData) {
  await requireAdmin();
  const date = str(f, "date");
  const startTime = str(f, "start_time");
  const endTime = str(f, "end_time");
  const repeat = Math.min(Math.max(int(f, "repeat_weeks") || 1, 1), 26);
  if (!date || !startTime || !endTime || endTime <= startTime) fail("/admin/groups", "Check the date and times.");
  const capacity = int(f, "capacity");
  if (capacity < 1) fail("/admin/groups", "Capacity must be at least 1.");

  const base = {
    title: str(f, "title") || "Group session",
    description: str(f, "description") || null,
    level: str(f, "level") || null,
    capacity,
    price_cents: cents(f, "price"),
  };

  const rows = Array.from({ length: repeat }, (_, i) => {
    const s = localToUtc(date, startTime);
    const e = localToUtc(date, endTime);
    return {
      ...base,
      starts_at: new Date(s.getTime() + i * 7 * 86_400_000).toISOString(),
      ends_at: new Date(e.getTime() + i * 7 * 86_400_000).toISOString(),
    };
  });

  const { data, error } = await db().from("group_sessions").insert(rows).select("*");
  if (error) fail("/admin/groups", error.message);

  const settings = await getSettings();
  for (const s of (data ?? []) as GroupSession[]) {
    const eventId = await createEvent({
      summary: `👥 ${s.title} (group)`,
      description: `Capacity: ${s.capacity}\nAttendees: see ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/groups`,
      location: `${settings.venue_name}, ${settings.venue_address}`,
      start: s.starts_at,
      end: s.ends_at,
      appEventId: s.id,
    });
    if (eventId) await db().from("group_sessions").update({ google_event_id: eventId }).eq("id", s.id);
  }

  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidateTag(TAGS.groups);
  redirect(`/admin/groups?saved=${rows.length}`);
}

export async function updateGroupSession(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const { error } = await db()
    .from("group_sessions")
    .update({
      title: str(f, "title"),
      description: str(f, "description") || null,
      level: str(f, "level") || null,
      capacity: int(f, "capacity"),
      price_cents: cents(f, "price"),
    })
    .eq("id", id);
  if (error) fail("/admin/groups", error.message);
  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidateTag(TAGS.groups);
  redirect("/admin/groups?updated=1");
}

export async function cancelGroupSession(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const refund = f.get("refund") === "on";
  const { data: s } = await db().from("group_sessions").select("*").eq("id", id).single();
  const session = s as GroupSession;

  const { data: bookings } = await db()
    .from("bookings")
    .select("*")
    .eq("group_session_id", id)
    .in("status", ["pending", "confirmed"]);
  for (const b of (bookings ?? []) as Booking[]) {
    try {
      await cancelBooking(b, "admin", { refund });
    } catch (e) {
      console.error("Failed to cancel booking", b.id, e);
    }
  }
  await db().from("group_sessions").update({ status: "cancelled" }).eq("id", id);
  await deleteEvent(session?.google_event_id);
  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidateTag(TAGS.groups);
}

export async function moveGroupSession(f: FormData) {
  await requireAdmin();
  const date = str(f, "date");
  const startTime = str(f, "start_time");
  const endTime = str(f, "end_time");
  if (!date || !startTime || !endTime) fail("/admin/groups", "Pick the new date and times.");
  const { data } = await db().from("group_sessions").select("*").eq("id", str(f, "id")).single();
  let emailed = 0;
  try {
    emailed = await rescheduleGroupSession(data as GroupSession, localToUtc(date, startTime), localToUtc(date, endTime), str(f, "note").slice(0, 500));
  } catch (e) {
    fail("/admin/groups", (e as Error).message);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/groups");
  revalidateTag(TAGS.groups);
  redirect(`/admin/groups?moved=${emailed}`);
}

export async function deleteGroupSession(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const { data: s } = await db().from("group_sessions").select("google_event_id").eq("id", id).single();
  const { error } = await db().from("group_sessions").delete().eq("id", id);
  if (error) fail("/admin/groups", "This session has bookings - cancel it instead.");
  await deleteEvent((s as { google_event_id: string | null } | null)?.google_event_id);
  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidateTag(TAGS.groups);
}

// ------------------------------------------------------------------ Bookings
export async function adminCancelBooking(f: FormData) {
  await requireAdmin();
  const { data } = await db().from("bookings").select("*").eq("id", str(f, "id")).single();
  try {
    await cancelBooking(data as Booking, "admin", { refund: f.get("refund") === "on" });
  } catch (e) {
    fail("/admin/bookings", (e as Error).message);
  }
  revalidatePath("/admin", "layout");
}

export async function adminRescheduleBooking(f: FormData) {
  await requireAdmin();
  const date = str(f, "date");
  const time = str(f, "time");
  if (!date || !time) fail("/admin/bookings", "Pick the new date and time.");
  const { data } = await db().from("bookings").select("*").eq("id", str(f, "id")).single();
  const b = data as Booking;
  try {
    await rescheduleBooking(b, localToUtc(date, time), str(f, "note").slice(0, 500));
  } catch (e) {
    fail("/admin/bookings", (e as Error).message);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/bookings?moved=${encodeURIComponent(b.customer_name)}`);
}

export async function markRefundHandled(f: FormData) {
  await requireAdmin();
  await db().from("bookings").update({ refund_status: "processed", refund_note: "Marked as refunded manually" }).eq("id", str(f, "id"));
  revalidatePath("/admin/bookings");
}
