"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomerForm, { postBooking } from "./CustomerForm";
import { CourtLines } from "./Court";
import Spinner from "./ui/Spinner";

type Lesson = { id: string; name: string; description: string | null; duration_minutes: number; price_cents: number };
type Slot = { start: string; end: string; label: string };

const TZ = "Africa/Johannesburg";
const rand = (c: number) => "R" + (c / 100).toLocaleString("en-ZA", { maximumFractionDigits: 2 }).replace(/ /g, " ");
const todayLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const monthOf = (d: string) => d.slice(0, 7);
function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function longDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function PrivateBookingFlow({
  lessons,
  horizonDays,
  cancellationHours,
  venue,
  defaultEmail,
}: {
  lessons: Lesson[];
  horizonDays: number;
  cancellationHours: number;
  venue: string;
  defaultEmail?: string;
}) {
  const [lesson, setLesson] = useState<Lesson | null>(lessons.length === 1 ? lessons[0] : null);
  const today = todayLocal();
  const [month, setMonth] = useState(monthOf(today));
  const [days, setDays] = useState<Record<string, Slot[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const lastMonth = useMemo(() => {
    const d = new Date(Date.now() + horizonDays * 86_400_000);
    return monthOf(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d));
  }, [horizonDays]);

  // Availability is cached briefly per lesson+month and prefetched (on hover, and the next month),
  // so moving around the calendar is instant. The server re-checks the slot when booking.
  const cache = useRef(new Map<string, { at: number; days: Promise<Record<string, Slot[]>>; ready?: Record<string, Slot[]> }>());
  const fetchMonth = useCallback((lessonId: string, m: string, fresh = false) => {
    const key = `${lessonId}|${m}`;
    const hit = cache.current.get(key);
    if (hit && !fresh && Date.now() - hit.at < 60_000) return hit;
    const entry: { at: number; days: Promise<Record<string, Slot[]>>; ready?: Record<string, Slot[]> } = {
      at: Date.now(),
      days: fetch(`/api/availability?lessonTypeId=${lessonId}&month=${m}`, { cache: "no-store" })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error);
          entry.ready = json.days;
          return json.days as Record<string, Slot[]>;
        })
        .catch((e) => {
          cache.current.delete(key);
          throw e;
        }),
    };
    entry.days.catch(() => {}); // prefetches may fail with nobody awaiting them
    cache.current.set(key, entry);
    return entry;
  }, []);

  const request = useRef(0);
  const load = useCallback(
    async (lessonId: string, m: string, fresh = false) => {
      const id = ++request.current;
      const entry = fetchMonth(lessonId, m, fresh);
      setError(null);
      if (entry.ready) {
        setDays(entry.ready);
        return entry.ready;
      }
      setLoading(true);
      try {
        const d = await entry.days;
        if (id === request.current) setDays(d);
        return d;
      } catch {
        if (id === request.current) {
          setError("Couldn't load availability. Please try again.");
          setDays({});
        }
        return {};
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [fetchMonth],
  );

  useEffect(() => {
    if (!lesson) return;
    let alive = true;
    load(lesson.id, month).then((d) => {
      if (!alive) return;
      // Auto-select the first available day so the slots show straight away.
      const first = Object.keys(d).sort()[0];
      setDate((cur) => (cur && d[cur] ? cur : first ?? null));
      if (month < lastMonth) fetchMonth(lesson.id, addMonths(month, 1));
    });
    return () => {
      alive = false;
    };
  }, [lesson, month, load, fetchMonth, lastMonth]);

  // ---------- Step 3: details ----------
  if (lesson && slot && date) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-6 sm:p-8">
          <StepTitle n={3} title="Your details" />
          <CustomerForm
            defaultEmail={defaultEmail}
            cancellationHours={cancellationHours}
            submitLabel={`Pay ${rand(lesson.price_cents)} & book`}
            onBack={() => setSlot(null)}
            onSubmit={async (v) => {
              const err = await postBooking({ type: "private", lessonTypeId: lesson.id, startsAt: slot.start, ...v });
              if (err) load(lesson.id, month, true);
              return err;
            }}
          />
        </div>
        <Summary lesson={lesson} date={date} slot={slot} venue={venue} />
      </div>
    );
  }

  // ---------- Step 1: lesson type ----------
  if (!lesson) {
    return (
      <div>
        <StepTitle n={1} title="Choose a lesson" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <button
              key={l.id}
              onClick={() => setLesson(l)}
              onPointerEnter={() => fetchMonth(l.id, month)}
              onFocus={() => fetchMonth(l.id, month)}
              className="card card-hover group flex flex-col p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <span className="badge self-start bg-brand-50 text-brand-700">
                <svg viewBox="0 0 24 24" className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                {l.duration_minutes} min
              </span>
              <h3 className="h-display mt-4 text-3xl">{l.name}</h3>
              {l.description && <p className="mt-2 text-sm text-slate-600">{l.description}</p>}
              <div className="h-6 shrink-0" />
              <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-5">
                <p className="h-display text-4xl">{rand(l.price_cents)}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand group-hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </div>
            </button>
          ))}
          {!lessons.length && <p className="text-slate-600">No lessons are available to book right now.</p>}
        </div>
      </div>
    );
  }

  // ---------- Step 2: calendar ----------
  const slots = date ? days[date] ?? [] : [];
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StepTitle n={2} title="Pick a date & time" />
        <button
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-brand"
          onClick={() => { setLesson(null); setDate(null); }}
        >
          {lesson.name} <span className="text-brand-600">Change</span>
        </button>
      </div>
      <div className="card grid overflow-hidden md:grid-cols-[1fr_320px]">
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <MonthButton dir="prev" disabled={month <= monthOf(today)} onClick={() => { setMonth(addMonths(month, -1)); setDate(null); }} />
            <p className="h-display flex items-center gap-2 text-3xl">
              {monthLabel(month)}
              {loading && <Spinner className="h-4 w-4 text-brand" />}
            </p>
            <MonthButton dir="next" disabled={month >= lastMonth} onClick={() => { setMonth(addMonths(month, 1)); setDate(null); }} />
          </div>
          <MonthGrid month={month} today={today} days={days} selected={date} onSelect={setDate} loading={loading} />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {!loading && !Object.keys(days).length && !error && (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              No open times this month.{" "}
              {month < lastMonth && (
                <button className="font-semibold text-brand-600 underline" onClick={() => setMonth(addMonths(month, 1))}>
                  Check next month
                </button>
              )}
            </p>
          )}
        </div>
        <div className="border-t border-slate-200/80 bg-slate-50/80 p-5 sm:p-6 md:border-l md:border-t-0">
          {loading && !date ? (
            <>
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton mb-4 mt-2 h-6 w-44 rounded-lg" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
                {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
              </div>
            </>
          ) : date ? (
            <div key={date} className="animate-fade-in">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Open times</p>
              <p className="h-display mb-4 mt-1 text-2xl">{longDate(date)}</p>
              <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-2">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => setSlot(s)}
                    className="rounded-xl border border-slate-200 bg-white py-3 font-bold text-ink shadow-sm transition hover:-translate-y-px hover:border-brand hover:bg-brand hover:text-white hover:shadow-glow"
                  >
                    {s.label}
                  </button>
                ))}
                {!slots.length && <p className="col-span-full text-sm text-slate-500">No times left on this day.</p>}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center text-sm text-slate-500">
              <svg viewBox="0 0 24 24" className="mb-2 h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
              Select a highlighted day to see open times.
            </div>
          )}
          <p className="mt-5 text-xs text-slate-500">Times shown in South African time (SAST).</p>
        </div>
      </div>
    </div>
  );
}

function MonthButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function MonthGrid({
  month, today, days, selected, onSelect, loading,
}: {
  month: string; today: string; days: Record<string, Slot[]>; selected: string | null; onSelect: (d: string) => void; loading: boolean;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=Sun
  const lead = (first + 6) % 7; // Monday-first
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);

  return (
    <div className={`transition-opacity duration-200 ${loading ? "pointer-events-none opacity-40" : ""}`} aria-busy={loading}>
      <div className="mb-3 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const has = !!days[d]?.length;
          const isSel = d === selected;
          return (
            <button
              key={d}
              disabled={!has}
              onClick={() => onSelect(d)}
              className={[
                "relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold transition sm:h-12 sm:w-12 sm:text-base",
                isSel ? "bg-brand text-white shadow-glow" : has ? "bg-brand-50 text-brand-700 hover:bg-brand-100" : "cursor-default text-slate-300",
                d === today && !isSel ? "ring-2 ring-inset ring-ink/15" : "",
              ].join(" ")}
            >
              {Number(d.slice(8))}
              {has && !isSel && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ball" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Summary({ lesson, date, slot, venue }: { lesson: Lesson; date: string; slot: Slot; venue: string }) {
  const end = new Date(slot.end).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
  return (
    <aside className="card h-fit overflow-hidden lg:sticky lg:top-28">
      <div className="relative overflow-hidden bg-ink p-6 text-white">
        <CourtLines className="pointer-events-none absolute -right-16 -top-10 w-72 text-white/10" strokeWidth={5} />
        <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Your booking</p>
        <p className="h-display relative mt-1 text-3xl">{lesson.name}</p>
      </div>
      <dl className="space-y-4 p-6 text-sm">
        <SummaryRow k="Date" v={longDate(date)} />
        <SummaryRow k="Time" v={`${slot.label} – ${end}`} />
        <SummaryRow k="Venue" v={venue} />
        <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
          <dt className="font-semibold">Total</dt>
          <dd className="h-display text-4xl">{rand(lesson.price_cents)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="h-display mb-4 flex items-center gap-3 text-3xl">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg text-white shadow-glow">{n}</span>
      {title}
    </h2>
  );
}
