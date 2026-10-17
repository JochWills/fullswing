import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "./env";

export function rand(cents: number): string {
  const r = cents / 100;
  return "R" + r.toLocaleString("en-ZA", { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 }).replace(/ /g, " ");
}

export function fmtDate(iso: string | Date, pattern = "EEEE d MMMM yyyy"): string {
  return formatInTimeZone(iso, TZ, pattern);
}

export function fmtTime(iso: string | Date): string {
  return formatInTimeZone(iso, TZ, "HH:mm");
}

export function fmtDateTime(iso: string | Date): string {
  return formatInTimeZone(iso, TZ, "EEE d MMM yyyy, HH:mm");
}

export function fmtRange(start: string, end: string): string {
  return `${fmtDate(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
