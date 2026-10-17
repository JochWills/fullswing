"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import SubmitButton from "./SubmitButton";

type Mode = "days" | "part";
const REASONS = ["Holiday", "Tournament", "Appointment", "Sick"];

const parse = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => {
  const t = parse(d);
  return `${DAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
};
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Time-off form: pick whole days or part of one day, with a plain-English summary of what will be blocked. */
export default function TimeOffForm({ action }: { action: (f: FormData) => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("days");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  function reset() {
    setFrom("");
    setTo("");
    setStart("");
    setEnd("");
    setReason("");
  }

  function changeFrom(v: string) {
    setFrom(v);
    if (to && v && to < v) setTo(""); // last day can't be before the first
  }

  // Plain-English summary + validation
  let summary: string | null = null;
  let problem: string | null = null;
  if (mode === "days" && from) {
    const last = to || from;
    const count = Math.round((parse(last).getTime() - parse(from).getTime()) / 86_400_000) + 1;
    summary = count === 1 ? `${short(from)}, all day` : `${short(from)} – ${short(last)} (${count} days), all day`;
  } else if (mode === "part" && from && start && end) {
    if (minutes(end) <= minutes(start)) problem = "“Until” must be later than “From”.";
    else {
      const mins = minutes(end) - minutes(start);
      const [h, m] = [Math.floor(mins / 60), mins % 60];
      const len = h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
      summary = `${short(from)}, ${start} – ${end} (${len})`;
    }
  }

  return (
    <form action={action} onReset={reset} className="card space-y-5 p-5 sm:p-6">
      {/* 1. What kind of time off */}
      <div role="radiogroup" aria-label="Type of time off" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {(
          [
            ["days", "Whole day(s)", "Holidays, tournaments"],
            ["part", "Part of a day", "Appointments"],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-xl px-3 py-2.5 text-left transition ${mode === value ? "bg-white shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-ink"}`}
          >
            <span className="block text-sm font-bold">{label}</span>
            <span className="block text-xs text-slate-500">{hint}</span>
          </button>
        ))}
      </div>

      {/* 2. When */}
      {mode === "days" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="all_day" value="on" />
          <div>
            <label className="label">First day</label>
            <DatePicker name="from_date" min="today" required value={from} onChange={changeFrom} />
          </div>
          <div>
            <label className="label">
              Last day <span className="font-normal text-slate-400">optional</span>
            </label>
            <DatePicker name="to_date" min={from || "today"} placeholder="Same as first day" value={to} onChange={setTo} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <label className="label">Date</label>
            <DatePicker name="from_date" min="today" required value={from} onChange={changeFrom} />
          </div>
          <div>
            <label className="label">From</label>
            <TimePicker name="from_time" required value={start} onChange={setStart} />
          </div>
          <div>
            <label className="label">Until</label>
            <TimePicker name="to_time" required value={end} onChange={setEnd} />
          </div>
        </div>
      )}

      {/* 3. Why (optional) */}
      <div>
        <label className="label" htmlFor="reason">
          Note <span className="font-normal text-slate-400">optional · only you see this</span>
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(reason === r ? "" : r)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                reason === r ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <input id="reason" name="reason" className="input" placeholder="Or type your own…" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {/* Summary + submit */}
      <div
        className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
          problem ? "bg-red-50 text-red-700" : summary ? "bg-brand-50 text-brand-900" : "bg-slate-50 text-slate-500"
        }`}
        aria-live="polite"
      >
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {problem ? <path d="M12 8v5M12 16.5v.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /> : <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>}
        </svg>
        <p>
          {problem ??
            (summary ? (
              <>
                Clients won&apos;t be able to book <b>{summary}</b>. Existing bookings stay as they are.
              </>
            ) : mode === "days" ? (
              "Pick the first day you're away – add a last day for more than one day."
            ) : (
              "Pick the date and the hours you're unavailable."
            ))}
        </p>
      </div>

      <SubmitButton className="btn-primary w-full sm:w-auto" disabled={!!problem}>
        Block this time
      </SubmitButton>
    </form>
  );
}
