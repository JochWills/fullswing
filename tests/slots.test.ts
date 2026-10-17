import { test } from "node:test";
import assert from "node:assert/strict";
import { slotsForDate, slotsForMonth, weekdayOf } from "../src/lib/slots.ts";

const TZ = "Africa/Johannesburg";
const base = {
  rules: [{ weekday: 1, start_time: "14:00:00", end_time: "17:00:00" }],
  busy: [],
  durationMinutes: 60,
  intervalMinutes: 30,
  bufferMinutes: 0,
  minNoticeHours: 0,
  horizonDays: 60,
  now: new Date("2026-10-01T00:00:00Z"),
  timeZone: TZ,
};

test("weekdayOf", () => {
  assert.equal(weekdayOf("2026-10-19"), 1); // Monday
  assert.equal(weekdayOf("2026-10-18"), 0); // Sunday
});

test("generates half-hourly 60-min slots inside the window, in local time", () => {
  const s = slotsForDate("2026-10-19", base);
  assert.deepEqual(s.map((x) => x.label), ["14:00", "14:30", "15:00", "15:30", "16:00"]);
  assert.equal(s[0].start, "2026-10-19T12:00:00.000Z"); // 14:00 SAST = 12:00 UTC
});

test("no slots on days without rules", () => {
  assert.equal(slotsForDate("2026-10-20", base).length, 0);
});

test("busy intervals remove overlapping slots", () => {
  const s = slotsForDate("2026-10-19", {
    ...base,
    busy: [{ start: new Date("2026-10-19T13:00:00Z"), end: new Date("2026-10-19T14:00:00Z") }], // 15:00-16:00 local
  });
  assert.deepEqual(s.map((x) => x.label), ["14:00", "16:00"]);
});

test("buffer widens busy time", () => {
  const s = slotsForDate("2026-10-19", {
    ...base,
    bufferMinutes: 30,
    busy: [{ start: new Date("2026-10-19T13:00:00Z"), end: new Date("2026-10-19T14:00:00Z") }],
  });
  assert.deepEqual(s.map((x) => x.label), []);
});

test("minimum notice hides near slots", () => {
  const s = slotsForDate("2026-10-19", { ...base, now: new Date("2026-10-19T10:00:00Z"), minNoticeHours: 3 });
  assert.deepEqual(s.map((x) => x.label), ["15:00", "15:30", "16:00"]);
});

test("horizon limits far dates", () => {
  const m = slotsForMonth("2026-10", { ...base, horizonDays: 10 });
  assert.deepEqual(Object.keys(m), ["2026-10-05"]);
});
