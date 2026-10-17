"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chevron, useDismiss, useFormReset, usePlacement } from "./popover";

const TZ = "Africa/Johannesburg";
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parts = (s: string) => s.split("-").map(Number) as [number, number, number];
const todayLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
function shift(date: string, days: number) {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
function shiftMonth(date: string, n: number) {
  const [y, m, d] = parts(date);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m - 1 + n, Math.min(d, last)));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
const fmt = (s: string, opts: Intl.DateTimeFormatOptions) => {
  const [y, m, d] = parts(s);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-ZA", { ...opts, timeZone: "UTC" });
};

/** Calendar date picker that posts "YYYY-MM-DD", like <input type="date">. Weeks start on Monday. */
export default function DatePicker({
  name,
  defaultValue = "",
  value: controlled,
  onChange,
  required,
  min,
  placeholder = "Select date",
  id,
}: {
  name: string;
  defaultValue?: string;
  /** Controlled value ("YYYY-MM-DD" or ""); omit to let the picker manage its own state. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** Earliest selectable date, "YYYY-MM-DD" or "today". */
  min?: string;
  placeholder?: string;
  id?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onChange?.(v);
  };
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [focus, setFocus] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "today" depends on the clock, so resolve it on the client only.
  useEffect(() => setToday(todayLocal()), []);
  const minDate = min === "today" ? today : min;

  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);
  useFormReset(inputRef, useCallback(() => setInternal(defaultValue), [defaultValue]));
  const up = usePlacement(rootRef, open, 380);

  useEffect(() => {
    if (open) gridRef.current?.focus();
  }, [open]);

  const disabled = (d: string) => !!minDate && d < minDate;

  function openCal() {
    const start = value || (minDate && minDate > today ? minDate : today);
    setFocus(start);
    setOpen(true);
  }

  function choose(d: string) {
    if (disabled(d)) return;
    setValue(d);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onGridKey(e: React.KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shift(focus, -1),
      ArrowRight: () => shift(focus, 1),
      ArrowUp: () => shift(focus, -7),
      ArrowDown: () => shift(focus, 7),
      PageUp: () => shiftMonth(focus, -1),
      PageDown: () => shiftMonth(focus, 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocus(moves[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(focus);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  // Month grid for the focused date
  const [fy, fm] = focus ? parts(focus) : [2000, 1];
  const lead = (new Date(Date.UTC(fy, fm - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(fy, fm, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= count; d++) cells.push(iso(fy, fm, d));
  const prevDisabled = !!minDate && iso(fy, fm, 1) <= minDate;

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        onFocus={() => buttonRef.current?.focus()}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openCal())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openCal();
          }
        }}
        className={`input group flex items-center gap-2.5 text-left ${open ? "border-brand ring-4 ring-brand/15" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className={`flex-1 truncate ${value ? "" : "text-slate-400"}`}>
          {value ? fmt(value, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : placeholder}
        </span>
        {chevron}
      </button>

      {open && focus && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={`absolute left-0 z-30 w-[19rem] rounded-3xl border border-slate-200 bg-white p-4 shadow-lift ${up ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <NavButton dir="prev" disabled={prevDisabled} onClick={() => setFocus(shiftMonth(focus, -1))} />
            <p className="h-display text-xl" aria-live="polite">{fmt(focus, { month: "long", year: "numeric" })}</p>
            <NavButton dir="next" onClick={() => setFocus(shiftMonth(focus, 1))} />
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} className="grid grid-cols-7 gap-0.5 rounded-xl focus:outline-none" role="grid">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const isSel = d === value;
              const isFocus = d === focus;
              const off = disabled(d);
              return (
                <button
                  key={d}
                  type="button"
                  tabIndex={-1}
                  disabled={off}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(d)}
                  aria-pressed={isSel}
                  aria-label={fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  className={[
                    "flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition",
                    isSel ? "bg-brand text-white shadow-glow" : off ? "cursor-not-allowed text-slate-300" : "text-ink hover:bg-brand-50",
                    isFocus && !isSel ? "ring-2 ring-inset ring-brand/50" : "",
                    d === today && !isSel ? "text-brand-700 underline decoration-ball decoration-2 underline-offset-4" : "",
                  ].join(" ")}
                >
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
            <button type="button" className="rounded-full px-3 py-1.5 text-brand-600 hover:bg-brand-50 disabled:opacity-40" disabled={disabled(today)} onClick={() => choose(today)}>
              Today
            </button>
            {!required && value && (
              <button type="button" className="rounded-full px-3 py-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setValue(""); setOpen(false); }}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-200"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
