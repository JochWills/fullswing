// Pure slot-generation logic (no Supabase / Next imports so it can be unit tested).
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export type Interval = { start: Date; end: Date };
export type Rule = { weekday: number; start_time: string; end_time: string };

export type SlotOptions = {
  rules: Rule[];
  busy: Interval[]; // existing bookings, group sessions, blocked periods, Google busy
  durationMinutes: number;
  intervalMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  now: Date;
  timeZone: string;
};

export type Slot = { start: string; end: string; label: string };

const MIN = 60_000;

/** "2026-10-16" -> weekday (0=Sun) for that calendar date. */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** All "YYYY-MM-DD" dates in a month string "YYYY-MM". */
export function datesInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Available start times for one local date. */
export function slotsForDate(dateStr: string, o: SlotOptions): Slot[] {
  const weekday = weekdayOf(dateStr);
  const earliest = new Date(o.now.getTime() + o.minNoticeHours * 60 * MIN);
  const latest = new Date(o.now.getTime() + o.horizonDays * 24 * 60 * MIN);
  const buffer = o.bufferMinutes * MIN;
  const busy = o.busy.map((b) => ({
    start: new Date(b.start.getTime() - buffer),
    end: new Date(b.end.getTime() + buffer),
  }));

  const seen = new Set<string>();
  const slots: Slot[] = [];

  for (const rule of o.rules.filter((r) => r.weekday === weekday)) {
    const windowStart = fromZonedTime(`${dateStr}T${rule.start_time.slice(0, 5)}:00`, o.timeZone);
    const windowEnd = fromZonedTime(`${dateStr}T${rule.end_time.slice(0, 5)}:00`, o.timeZone);

    for (
      let t = windowStart.getTime();
      t + o.durationMinutes * MIN <= windowEnd.getTime();
      t += o.intervalMinutes * MIN
    ) {
      const slot = { start: new Date(t), end: new Date(t + o.durationMinutes * MIN) };
      if (slot.start < earliest || slot.start > latest) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      const key = slot.start.toISOString();
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push({
        start: key,
        end: slot.end.toISOString(),
        label: formatInTimeZone(slot.start, o.timeZone, "HH:mm"),
      });
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/** Slots for every date of a month: { "2026-10-16": [...] } (only dates with slots). */
export function slotsForMonth(month: string, o: SlotOptions): Record<string, Slot[]> {
  const out: Record<string, Slot[]> = {};
  for (const d of datesInMonth(month)) {
    const s = slotsForDate(d, o);
    if (s.length) out[d] = s;
  }
  return out;
}

/** UTC range covering a whole local month (padded a day each side). */
export function monthRange(month: string, timeZone: string): Interval {
  const dates = datesInMonth(month);
  const start = fromZonedTime(`${dates[0]}T00:00:00`, timeZone);
  const end = fromZonedTime(`${dates[dates.length - 1]}T23:59:59`, timeZone);
  return { start: new Date(start.getTime() - 86_400_000), end: new Date(end.getTime() + 86_400_000) };
}
