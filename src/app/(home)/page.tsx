import Link from "next/link";
import { Suspense } from "react";
import { activeLessonTypes, getSettings, scheduledGroupSessions, upcomingGroupSessions } from "@/lib/data";
import { rand } from "@/lib/format";
import GroupSessionCard from "@/components/GroupSessionCard";
import Image from "next/image";
import { CourtLines, TennisBall } from "@/components/Court";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default async function Home() {
  // All cached, so the page renders immediately; live spot counts stream in below.
  const [settings, sessions, lessons] = await Promise.all([getSettings(), scheduledGroupSessions(), activeLessonTypes()]);
  const fromPrice = lessons.length ? Math.min(...lessons.map((l) => l.price_cents)) : null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#EEF8FE_0%,#F7FBFE_55%,#F8FAFC_100%)]">
        {/* Court photo, cut on a diagonal (large screens) */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 right-0 hidden lg:block xl:left-[45%] min-[1600px]:left-1/2"
          style={{ clipPath: "polygon(44% 0, 100% 0, 100% 100%, 0 100%)" }}
          aria-hidden
        >
          <Image src="/hero/venue-blur.jpg" alt="" fill priority sizes="55vw" className="scale-110 object-cover object-[60%_55%]" />
          <VenueTint />
        </div>

        <div className="container-wide relative grid items-center gap-10 pb-12 pt-10 sm:pt-14 lg:min-h-[640px] lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:pb-16 lg:pt-[72px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-ball-100 bg-ball-50 py-2 pl-3 pr-4 text-[15px] font-medium text-slate-800">
              <PinIcon />
              {settings.venue_name}
            </p>
            <h1 className="mt-6 font-heavy text-[min(4.5rem,calc((100vw-2rem)/7))] font-black uppercase leading-[0.96] tracking-[-0.035em] text-ink whitespace-nowrap sm:text-7xl lg:text-[4.3rem] xl:text-[5.45rem]">
              Find your
              <br />
              <span className="relative inline-block bg-gradient-to-r from-[#0790DA] to-[#1499E3] bg-clip-text pb-1 text-transparent">
                Full swing.
                <svg viewBox="0 0 660 26" className="absolute -bottom-2.5 left-0 w-[96%]" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="swoosh" x1="0" x2="1">
                      <stop offset="0" stopColor="#5DBB07" />
                      <stop offset="1" stopColor="#C5E005" />
                    </linearGradient>
                  </defs>
                  <path d="M3 19C150 9 380 2 652 9c6 .2 6 7 0 7C430 13 190 17 12 25c-9 .4-12-5-9-6z" fill="url(#swoosh)" />
                </svg>
              </span>
            </h1>
            <p className="mt-8 max-w-[31rem] text-lg leading-[1.6] text-slate-600 sm:text-[1.2rem]">
              Private coaching and group sessions for juniors and adults. Pick a time that suits you, pay securely, and
              you&apos;re on court.
            </p>
            <div className="mt-8 flex flex-col gap-3 whitespace-nowrap sm:flex-row sm:gap-4 xl:gap-6">
              <Link href="/book" className="btn-primary px-6 xl:px-8 py-[1.15rem] text-base font-bold">
                <HeroCalendar /> <span className="ml-2">Book a private lesson</span> <Arrow />
              </Link>
              <Link href="/groups" className="btn border border-slate-200 bg-white px-6 xl:px-8 py-[1.15rem] text-base font-bold text-ink shadow-sm hover:border-slate-300 hover:shadow-soft">
                Join a group session <Arrow />
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-3 gap-3 sm:flex sm:gap-8 lg:gap-6 xl:gap-8">
              {[
                [<PersonIcon key="i" />, "Juniors & adults", "Private & group"],
                [<BallIcon key="i" small />, fromPrice !== null ? `From ${rand(fromPrice)}` : "All levels", fromPrice !== null ? "per lesson" : "welcome"],
                [<ClockIcon key="i" />, "Free cancellation", `up to ${settings.cancellation_hours}h before`],
              ].map(([icon, title, sub], i) => (
                <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:flex-col lg:items-start lg:gap-2 xl:flex-row xl:items-center xl:gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ball-50 text-ball-500 ring-1 ring-ball-100">
                    {icon}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-sm font-semibold text-ink sm:whitespace-nowrap">{title}</span>
                    <span className="mt-0.5 block text-[13px] text-slate-500 sm:whitespace-nowrap">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Logo card on court */}
          <div className="relative -mx-4 overflow-hidden px-6 py-12 sm:mx-0 sm:rounded-[2rem] sm:px-10 lg:overflow-visible lg:p-0">
            <div className="absolute inset-0 overflow-hidden lg:hidden" aria-hidden>
              <Image src="/hero/venue-blur.jpg" alt="" fill sizes="100vw" className="scale-110 object-cover" />
              <VenueTint />
            </div>
            <div className="relative mx-auto w-full max-w-[30rem] lg:ml-auto lg:mr-6 lg:translate-y-1 xl:mr-10">
              <div className="relative rounded-[1.9rem] bg-white p-2 shadow-[0_30px_60px_-24px_rgb(7_27_49/0.45)]">
                <div className="relative overflow-hidden rounded-[1.45rem] px-[9%] pb-[10%] pt-[8.5%]">
                  <Image src="/hero/court-inner.jpg" alt="" fill sizes="(min-width: 1024px) 34rem, 100vw" className="object-cover" aria-hidden />
                  <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-white shadow-[0_18px_40px_-18px_rgb(7_27_49/0.5)] ring-4 ring-white">
                    <Image
                      src="/hero/on-court.jpg"
                      alt="Head Coach William Wickens on court at St Francis Bay"
                      fill
                      priority
                      sizes="(min-width: 1280px) 26rem, (min-width: 1024px) 22rem, 90vw"
                      className="object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink shadow-sm backdrop-blur sm:left-4 sm:top-4">
                      Head Coach · William Wickens
                    </span>
                  </div>
                </div>
              </div>
              <Image
                src="/hero/ball.png"
                alt=""
                width={128}
                height={128}
                className="absolute -right-3 -top-7 w-20 drop-shadow-[0_14px_14px_rgb(7_27_49/0.3)] sm:-right-5 sm:-top-9 sm:w-[6.5rem]"
                aria-hidden
              />
              {fromPrice !== null && (
                <div className="absolute -bottom-6 left-[11%] rounded-[1.15rem] bg-white px-5 pb-3.5 pt-3.5 shadow-[0_18px_40px_-16px_rgb(7_27_49/0.45)] sm:-bottom-7 sm:px-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Private lessons from</p>
                  <p className="mt-1 font-heavy text-[1.85rem] font-extrabold leading-none tracking-tight text-ink">{rand(fromPrice)}</p>
                  <span className="mt-1.5 block h-[3px] w-14 rounded-full bg-ball-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Two ways to play */}
      <section className="container-wide">
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

      {/* Coach */}
      <section className="container-wide mt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-[30rem]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-black/5">
              <Image
                src="/hero/coach-william.jpg"
                alt="Head Coach William Wickens on court at St Francis Bay"
                fill
                sizes="(min-width: 1024px) 28rem, 90vw"
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <SectionTitle eyebrow="Meet your coach" title="William Wickens" />
            <p className="-mt-4 mb-6 text-sm font-bold uppercase tracking-[0.14em] text-brand-600">Head Coach</p>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              William leads the coaching at {settings.venue_name}, with private lessons and group sessions for juniors and
              adults. Book a one-on-one lesson to work on your game, or join a group session.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="btn-primary btn-lg">
                Book a lesson with William <Arrow />
              </Link>
              <Link href="/groups" className="btn-ghost btn-lg">
                See group sessions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {sessions.length > 0 && (
        <section className="container-wide mt-24">
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
      <section className="container-wide mt-24">
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
      <section className="container-wide mt-24">
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
      <p className="inline-flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600">
        <span className="h-1 w-8 rounded-full bg-brand" />
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
function BallIcon({ small }: { small?: boolean }) {
  return (
    <svg {...iconProps} className={small ? "h-5 w-5" : iconProps.className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.7c2.6 2.2 3.6 4.1 3.6 6.3s-1 4.1-3.6 6.3M18.4 5.7c-2.6 2.2-3.6 4.1-3.6 6.3s1 4.1 3.6 6.3" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-ball-500" aria-hidden>
      <path fill="currentColor" d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.2 11.6 6.9 12.3a.9.9 0 0 0 1.2 0c.7-.7 6.9-7 6.9-12.3A7.5 7.5 0 0 0 12 2z" />
      <circle cx="12" cy="9.5" r="2.8" fill="#fff" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function HeroCalendar() {
  return (
    <svg {...iconProps} className="h-6 w-6">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth={2.4} />
    </svg>
  );
}
/** Brand-blue wash over the blurred venue photo, so the hero keeps its blue look. */
function VenueTint() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#0B5FA0_0%,#0193DD_55%,#0A6FB4_100%)] opacity-80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgb(255_255_255/0.22),transparent_55%)]" />
    </>
  );
}
