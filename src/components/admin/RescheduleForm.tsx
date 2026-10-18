"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import SubmitButton from "./SubmitButton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, day));
  return `${DAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
};
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Move a private lesson (fixed length, pick a new start) or a group session (pick start and end)
 * to a new time, with an optional message that goes into the client email.
 */
export default function RescheduleForm({
  action,
  id,
  kind,
  who,
  defaultDate,
  defaultStart,
  defaultEnd,
}: {
  action: (f: FormData) => Promise<void>;
  id: string;
  kind: "private" | "group";
  /** Who gets emailed, e.g. "Sarah" or "Everyone booked (3 bookings)"; empty when nobody is booked. */
  who: string;
  defaultDate: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState(defaultEnd);
  const [note, setNote] = useState("");

  const length = minutes(defaultEnd) - minutes(defaultStart);
  const word = kind === "group" ? "session" : "lesson";
  const reasons = [
    ["Rain", `Unfortunately the weather isn't playable, so we've moved your ${word}.`],
    ["Something came up", `Something has come up, so we've had to move your ${word}. Sorry for the change!`],
  ] as const;

  const endTime = kind === "private" ? (start ? hhmm(minutes(start) + length) : "") : end;
  let problem: string | null = null;
  if (kind === "group" && start && end && minutes(end) <= minutes(start)) problem = "The end time must be after the start time.";
  else if (date === defaultDate && start === defaultStart && endTime === defaultEnd) problem = "That's the time it's already booked for.";
  const ready = !!date && !!start && !!endTime && !problem;

  if (!open) {
    return (
      <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Reschedule
      </button>
    );
  }

  return (
    <form action={action} className="w-full space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">Move to a new time</p>
        <button type="button" className="text-sm font-semibold text-slate-500 hover:text-ink" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <div className={`grid gap-3 ${kind === "group" ? "sm:grid-cols-[1.3fr_1fr_1fr]" : "sm:grid-cols-[1.3fr_1fr]"}`}>
        <div>
          <label className="label">New date</label>
          <DatePicker name="date" min="today" required value={date} onChange={setDate} />
        </div>
        {kind === "private" ? (
          <div>
            <label className="label">Start</label>
            <TimePicker name="time" required value={start} onChange={setStart} />
          </div>
        ) : (
          <>
            <div>
              <label className="label">Start</label>
              <TimePicker
                name="start_time"
                required
                value={start}
                onChange={(v) => {
                  setStart(v);
                  setEnd(hhmm(minutes(v) + length)); // keep the same length by default
                }}
              />
            </div>
            <div>
              <label className="label">End</label>
              <TimePicker name="end_time" required value={end} onChange={setEnd} />
            </div>
          </>
        )}
      </div>

      <div>
        <label className="label" htmlFor={`note-${id}`}>
          Message <span className="font-normal text-slate-400">optional · included in the email</span>
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {reasons.map(([label, text]) => (
            <button
              key={label}
              type="button"
              onClick={() => setNote(note === text ? "" : text)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                note === text ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea id={`note-${id}`} name="note" rows={2} maxLength={500} className="input" placeholder="Or write your own…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <p className={`rounded-xl p-3 text-sm ${problem ? "bg-red-50 text-red-700" : ready ? "bg-brand-50 text-brand-900" : "bg-white text-slate-500"}`} aria-live="polite">
        {problem ??
          (ready ? (
            <>
              Moving to <b>{short(date)}, {start}–{endTime}</b>.{" "}
              {who ? <>{who} will get an email with the new time and can cancel for a full refund if it doesn&apos;t suit.</> : "Nobody is booked yet, so no emails go out."}
            </>
          ) : (
            `Pick the new date and ${kind === "group" ? "times" : "start time"}. Any free time works, even outside your normal hours.`
          ))}
      </p>

      <SubmitButton className="btn-primary btn-sm" disabled={!ready}>
        Move {word}
      </SubmitButton>
    </form>
  );
}
