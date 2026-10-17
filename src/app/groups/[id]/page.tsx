import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { getSettings, withSpotsLeft } from "@/lib/data";
import { getViewer } from "@/lib/auth";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import GroupBookingForm from "@/components/GroupBookingForm";
import { CourtLines } from "@/components/Court";
import type { GroupSession } from "@/lib/types";

export default async function GroupSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data }, settings, user] = await Promise.all([
    db().from("group_sessions").select("*").eq("id", id).eq("status", "scheduled").maybeSingle(),
    getSettings(),
    getViewer(),
  ]);
  if (!data) notFound();
  const [session] = await withSpotsLeft([data as GroupSession]);
  const past = new Date(session.starts_at) <= new Date();

  return (
    <div className="container-x py-10">
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:gap-2.5">← All group sessions</Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-6 sm:p-8">
          <p className="eyebrow text-ball-700"><span className="h-1.5 w-6 rounded-full bg-ball" />Group session</p>
          <h1 className="h-display mt-3 text-5xl sm:text-6xl">{session.title}</h1>
          {session.description && <p className="mt-3 whitespace-pre-line text-slate-600">{session.description}</p>}
          <div className="my-7 border-t border-dashed border-slate-200" />
          {past ? (
            <p className="font-semibold text-slate-600">This session has already started.</p>
          ) : session.spots_left <= 0 ? (
            <p className="font-semibold text-slate-600">This session is full. <Link className="text-brand-600 underline" href="/groups">See other sessions</Link></p>
          ) : (
            <GroupBookingForm
              sessionId={session.id}
              priceCents={session.price_cents}
              maxSpots={Math.min(session.spots_left, 4)}
              cancellationHours={settings.cancellation_hours}
              defaultEmail={user?.email ?? undefined}
            />
          )}
        </div>
        <aside className="card h-fit overflow-hidden lg:sticky lg:top-28">
          <div className="relative overflow-hidden bg-ink p-6 text-white">
            <CourtLines className="pointer-events-none absolute -right-16 -top-10 w-72 text-white/10" strokeWidth={5} />
            <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-ball">When</p>
            <p className="h-display relative mt-1 text-3xl">{fmtDate(session.starts_at, "EEEE d MMMM")}</p>
          </div>
          <dl className="space-y-4 p-6 text-sm">
            <div><dt className="text-slate-500">Time</dt><dd className="font-semibold">{fmtTime(session.starts_at)} – {fmtTime(session.ends_at)}</dd></div>
            {session.level && <div><dt className="text-slate-500">Level</dt><dd className="font-semibold">{session.level}</dd></div>}
            <div><dt className="text-slate-500">Venue</dt><dd className="font-semibold">{settings.venue_name}</dd></div>
            <div><dt className="text-slate-500">Spots left</dt><dd className="font-semibold">{session.spots_left} of {session.capacity}</dd></div>
            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
              <dt className="font-semibold">Price per player</dt><dd className="h-display text-4xl">{rand(session.price_cents)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
