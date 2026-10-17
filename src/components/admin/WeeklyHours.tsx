"use client";

import { useOptimistic, useRef, useState } from "react";
import ConfirmButton from "./ConfirmButton";
import SubmitButton from "./SubmitButton";
import TimePicker from "@/components/ui/TimePicker";
import type { AvailabilityRule } from "@/lib/types";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hm = (t: string) => t.slice(0, 5);

type Change = { type: "add"; rows: AvailabilityRule[] } | { type: "remove"; id: string };

/**
 * Weekly opening hours. Adds and removals show instantly (optimistic) while the server action
 * saves; the server's re-rendered list then takes over.
 */
export default function WeeklyHours({
  rules,
  addRule,
  deleteRule,
}: {
  rules: AvailabilityRule[];
  addRule: (f: FormData) => Promise<void>;
  deleteRule: (f: FormData) => Promise<void>;
}) {
  const [shown, apply] = useOptimistic(rules, (state: AvailabilityRule[], c: Change) =>
    c.type === "add"
      ? [...state, ...c.rows].sort((a, b) => a.start_time.localeCompare(b.start_time))
      : state.filter((r) => r.id !== c.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>(undefined);

  async function add(f: FormData) {
    const days = f.getAll("weekday").map(Number);
    const start = String(f.get("start_time") ?? "");
    const end = String(f.get("end_time") ?? "");
    if (!days.length) return setError("Pick at least one day.");
    if (!start || !end || end <= start) return setError("“To” must be later than “From”.");
    setError(null);
    apply({
      type: "add",
      rows: days.map((weekday) => ({ id: `pending-${weekday}-${start}`, weekday, start_time: `${start}:00`, end_time: `${end}:00` })),
    });
    await addRule(f);
    const names = ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAYS[d].slice(0, 3));
    setNotice(`Added ${start}–${end} on ${names.join(", ")}`);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }

  return (
    <>
      <div className="card divide-y divide-slate-100">
        {ORDER.map((d) => {
          const dayRules = shown.filter((r) => r.weekday === d);
          return (
            <div key={d} className="flex items-start gap-4 p-4">
              <p className="w-24 shrink-0 pt-1 font-semibold">{WEEKDAYS[d]}</p>
              <div className="flex flex-1 flex-wrap gap-2">
                {dayRules.length === 0 && <span className="pt-1 text-sm text-slate-400">Unavailable</span>}
                {dayRules.map((r) => {
                  const pending = r.id.startsWith("pending-");
                  const label = `${hm(r.start_time)}–${hm(r.end_time)}`;
                  return (
                    <form
                      key={r.id}
                      action={async (f) => {
                        apply({ type: "remove", id: r.id });
                        await deleteRule(f);
                      }}
                      className={`flex animate-fade-in items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm font-semibold transition ${
                        pending ? "bg-brand-50/60 text-brand-700/70" : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      <input type="hidden" name="id" value={r.id} />
                      {label}
                      {pending ? (
                        <span className="flex h-6 w-6 items-center justify-center" aria-label="Saving">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                        </span>
                      ) : (
                        <ConfirmButton
                          title="Remove these hours?"
                          message={<>{WEEKDAYS[d]} {label} will no longer be bookable. Existing bookings aren&apos;t affected.</>}
                          confirmLabel="Remove"
                          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-brand-100"
                          ariaLabel={`Remove ${WEEKDAYS[d]} ${label}`}
                        >
                          ×
                        </ConfirmButton>
                      )}
                    </form>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <form action={add} onChange={() => error && setError(null)} className="card mt-4 space-y-4 p-5">
        <p className="font-bold">Add hours</p>
        <div className="flex flex-wrap gap-2">
          {ORDER.map((d) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="weekday" value={d} className="peer sr-only" />
              <span className="inline-block rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-checked:shadow-glow peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20">
                {WEEKDAYS[d].slice(0, 3)}
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="label">From</label>
            <TimePicker name="start_time" defaultValue="14:00" required />
          </div>
          <div className="w-40">
            <label className="label">To</label>
            <TimePicker name="end_time" defaultValue="18:00" required />
          </div>
          <SubmitButton>Add</SubmitButton>
        </div>
        {error && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {notice && !error && (
          <p className="flex animate-fade-in items-center gap-2 rounded-xl bg-ball-50 p-3 text-sm font-semibold text-ball-700" role="status">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12l5 5 9-10" />
            </svg>
            {notice}
          </p>
        )}
      </form>
    </>
  );
}
