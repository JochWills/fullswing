import Link from "next/link";
import { Suspense } from "react";
import { activeLessonTypes, getSettings, scheduledGroupSessions, upcomingGroupSessions } from "@/lib/data";
import { rand } from "@/lib/format";
import GroupSessionCard from "@/components/GroupSessionCard";
import Logo from "@/components/Logo";
import { CourtLines, TennisBall } from "@/components/Court";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default async function Home() {
  // All cached, so the page renders immediately; live spot counts stream in below.
  const [settings, sessions, lessons] = await Promise.all([getSettings(), scheduledGroupSessions(), activeLessonTypes()]);
  const fromPrice = lessons.length ? Math.min(...lessons.map((l) => l.price_cents)) : null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-slate-50">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-ball/20 blur-3xl" aria-hidden />
        <div className="container-x relative grid items-center gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ball opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ball" />
              </span>
              {settings.venue_name}
            </p>
            <h1 className="h-display mt-6 text-[3.6rem] sm:text-7xl lg:text-[5.5rem]">
              Find your
              <br />
              <span className="relative inline-block text-brand">
                full swing.
                <svg viewBox="0 0 300 18" className="absolute -bottom-2 left-0 w-full text-ball" preserveAspectRatio="none" aria-hidden>
                  <path d="M3 13C70 4 180 2 297 9" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-600">
              Private coaching and group sessions for juniors and adults. Pick a time that suits you, pay securely, and
              you&apos;re on court.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="btn-primary btn-lg">
                Book a private lesson <Arrow />
              </Link>
              <Link href="/groups" className="btn-ghost btn-lg">
                Join a group session
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
              {[
                "Juniors & adults",
                fromPrice !== null ? `Lessons from ${rand(fromPrice)}` : "All levels welcome",
                `Free cancellation up to ${settings.cancellation_hours}h`,
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Logo showcase on a court */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-lift">
              <CourtLines className="absolute left-1/2 top-1/2 w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-90 text-white/25" strokeWidth={5} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
              <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
                <div className="w-full rounded-[2rem] bg-white px-6 py-7 shadow-lift ring-1 ring-black/5 sm:px-9 sm:py-10">
                  <Logo className="mx-auto h-auto w-full" priority />
                </div>
              </div>
            </div>
            <TennisBall className="absolute -right-3 -top-5 h-14 w-14 animate-bounce-ball drop-shadow-lg sm:-right-5 sm:h-16 sm:w-16" />
            {fromPrice !== null && (
              <div className="absolute -bottom-6 left-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-lift sm:left-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Private lessons from</p>
                <p className="h-display text-3xl">{rand(fromPrice)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Two ways to play */}
      <section className="container-x">
        <SectionTitle eyebrow="Two ways to play" title="Choose your game" />
        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/book" className="card card-hover group flex flex-col p-7 sm:p-8">
            <div className="flex items-center justify-between">
              <IconBadge tone="brand"><RacketIcon /></IconBadge>
              <span className="badge bg-brand-50 text-brand-700">One-on-one</span>
            </div>
            <h3 className="h-display mt-6 text-4xl">Private lessons</h3>
            <p className="mt-2 text-slate-600">Choose your lesson, see every open slot on the coach&apos;s calendar and book instantly.</p>
            {lessons.length > 0 && (
              <ul className="mt-6 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4 text-sm">
                {lessons.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-medium text-slate-700">{l.name}</span>
                    <span className="shrink-0 font-bold">{rand(l.price_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
            <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-brand-600 transition-all group-hover:gap-3">
              Pick a time <Arrow />
            </span>
          </Link>

          <Link href="/groups" className="card card-hover group flex flex-col p-7 sm:p-8">
            <div className="flex items-center justify-between">
              <IconBadge tone="ball"><GroupIcon /></IconBadge>
              <span className="badge bg-ball-50 text-ball-700">Play together</span>
            </div>
            <h3 className="h-display mt-6 text-4xl">Group sessions</h3>
            <p className="mt-2 text-slate-600">Drills, match play and fun clinics with limited spots. Book one session at a time.</p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm">
              {sessions.length ? (
                <p>
                  <span className="h-display mr-1 text-2xl text-ball-700">{sessions.length}</span> upcoming session
                  {sessions.length === 1 ? "" : "s"} open for booking.
                </p>
              ) : (
                <p className="text-slate-600">New sessions are added regularly – check back soon.</p>
              )}
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-ball-700 transition-all group-hover:gap-3">
              See sessions <Arrow />
            </span>
          </Link>
        </div>
      </section>

      {sessions.length > 0 && (
        <section className="container-x mt-24">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle eyebrow="Group sessions" title="Coming up" />
            <Link href="/groups" className="mb-8 hidden items-center gap-1.5 text-sm font-semibold text-brand-600 hover:gap-2.5 sm:inline-flex">
              All sessions <Arrow />
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.slice(0, 3).map((s) => (
                  <CardSkeleton key={s.id} tall />
                ))}
              </div>
            }
          >
            <ComingUp />
          </Suspense>
        </section>
      )}

      {/* How it works */}
      <section className="container-x mt-24">
        <SectionTitle eyebrow="Simple booking" title="How it works" />
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            ["Pick a time", "Choose a lesson type and an open slot, or a spot in a group session.", <CalendarIcon key="i" />],
            ["Pay securely", "Card, EFT or instant payment through Paystack. No account needed.", <CardIcon key="i" />],
            ["Play", `Get a confirmation email and a reminder the day before. Cancel up to ${settings.cancellation_hours}h before for a full refund.`, <BallIcon key="i" />],
          ].map(([t, d, icon], i) => (
            <li key={i} className="card relative overflow-hidden p-7">
              <span className="h-display pointer-events-none absolute right-6 top-5 text-7xl leading-none text-slate-100" aria-hidden>
                0{i + 1}
              </span>
              <div className="relative">
                <IconBadge tone="brand">{icon}</IconBadge>
                <h3 className="h-display mt-5 text-3xl">{t}</h3>
                <p className="mt-2 text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Call to action */}
      <section className="container-x mt-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <CourtLines className="pointer-events-none absolute left-1/2 top-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 text-white/[0.07]" strokeWidth={4} />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/30 blur-3xl" aria-hidden />
          <div className="relative">
            <TennisBall className="mx-auto h-12 w-12" />
            <h2 className="h-display mt-5 text-5xl sm:text-6xl">
              Ready to get <span className="text-brand">on court?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-slate-300">See open times and book in under a minute.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/book" className="btn-primary btn-lg">
                Book a private lesson <Arrow />
              </Link>
              <Link href="/groups" className="btn btn-lg border border-white/25 text-white hover:bg-white/10">
                Browse group sessions
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

async function ComingUp() {
  const sessions = await upcomingGroupSessions();
  return (
    <div className="grid animate-fade-in gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.slice(0, 3).map((s) => (
        <GroupSessionCard key={s.id} s={s} />
      ))}
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="eyebrow">
        <span className="h-1.5 w-6 rounded-full bg-brand" />
        {eyebrow}
      </p>
      <h2 className="h-display mt-3 text-5xl">{title}</h2>
    </div>
  );
}

function IconBadge({ tone, children }: { tone: "brand" | "ball"; children: React.ReactNode }) {
  return (
    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone === "brand" ? "bg-brand-50 text-brand-600" : "bg-ball-50 text-ball-700"}`}>
      {children}
    </span>
  );
}

const iconProps = { viewBox: "0 0 24 24", className: "h-6 w-6", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function Arrow() {
  return (
    <svg {...iconProps} className="h-4 w-4" strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function Check() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ball/20 text-ball-700">
      <svg {...iconProps} className="h-3 w-3" strokeWidth={3}>
        <path d="M5 12l5 5 9-10" />
      </svg>
    </span>
  );
}
function RacketIcon() {
  return (
    <svg {...iconProps}>
      <ellipse cx="14.5" cy="8.5" rx="5.5" ry="6" transform="rotate(40 14.5 8.5)" />
      <path d="M10.5 13 4 19.5M3 18.5l2.5 2.5M12 6l5 5M10.5 9l4.5 4.5" />
    </svg>
  );
}
function GroupIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.4c2.4.1 4 1.7 4.5 4.6" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8.5 15l2 2 4-4" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </svg>
  );
}
function BallIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.7c2.6 2.2 3.6 4.1 3.6 6.3s-1 4.1-3.6 6.3M18.4 5.7c-2.6 2.2-3.6 4.1-3.6 6.3s1 4.1 3.6 6.3" />
    </svg>
  );
}
