import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { getViewer } from "@/lib/auth";
import { canClientCancel } from "@/lib/bookings";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import { addToGoogleCalendarLink } from "@/lib/google";
import { siteUrl } from "@/lib/env";
import CancelBookingButton from "@/components/CancelBookingButton";
import StatusBadge from "@/components/StatusBadge";
import { CourtLines } from "@/components/Court";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Your booking", robots: { index: false } };

export default async function ManageBookingPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const [{ data }, settings, user] = await Promise.all([
    db().from("bookings").select("*").eq("manage_token", token).maybeSingle(),
    getSettings(),
    getViewer(),
  ]);
  const b = data as Booking | null;
  if (!b) notFound();
  const cancellable = canClientCancel(b, settings.cancellation_hours);
  const upcoming = new Date(b.starts_at) > new Date();

  const heading =
    b.status === "confirmed" ? (isNew ? "You're booked in! 🎾" : "Your booking")
    : b.status === "cancelled" ? "Booking cancelled"
    : b.status === "pending" ? "Awaiting payment"
    : "Booking expired";

  return (
    <div className="container-x max-w-2xl py-12">
      <h1 className="h-display text-5xl sm:text-6xl">{heading}</h1>
      {b.status === "confirmed" && isNew && (
        <p className="mt-2 text-slate-600">A confirmation has been sent to <b>{b.customer_email}</b>.</p>
      )}
      {b.status === "cancelled" && b.cancelled_by === "system" && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          That time was taken while you were paying, so we&apos;ve refunded you in full. Sorry about that!
        </p>
      )}

      {b.status === "confirmed" && upcoming && b.rescheduled_from && (
        <p className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-brand-900">
          This {b.kind === "group" ? "session" : "lesson"} was moved by your coach from {fmtDate(b.rescheduled_from, "EEE d MMM")} at {fmtTime(b.rescheduled_from)}.
          If the new time doesn&apos;t suit you, you can cancel below for a full refund any time before it starts.
        </p>
      )}

      <div className="card mt-8 overflow-hidden">
        <div className="relative flex items-start justify-between gap-3 overflow-hidden bg-ink p-6 text-white">
          <CourtLines className="pointer-events-none absolute -right-20 -top-12 w-80 text-white/10" strokeWidth={5} />
          <div className="relative">
            <p className="h-display text-3xl sm:text-4xl">{b.title}</p>
            <p className="mt-1 text-slate-300">{fmtDate(b.starts_at)}</p>
          </div>
          <span className="relative"><StatusBadge status={b.status} /></span>
        </div>
        <dl className="grid gap-5 p-6 text-sm sm:grid-cols-2">
          <Item k="Time" v={`${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}`} />
          <Item k="Venue" v={`${settings.venue_name}, ${settings.venue_address}`} />
          <Item k="Booked by" v={b.customer_name} />
          {b.player_name && <Item k="Player" v={b.player_name} />}
          {b.kind === "group" && b.spots > 1 && <Item k="Players" v={String(b.spots)} />}
          <Item k={b.status === "confirmed" ? "Paid" : "Amount"} v={rand(b.amount_cents)} />
          {b.refund_status !== "none" && (
            <Item k="Refund" v={{ pending: "Refund issued – processing", processed: "Refunded", failed: "Refund being handled manually", manual: "No payment taken (test mode)", none: "" }[b.refund_status]} />
          )}
        </dl>
        {b.status === "confirmed" && upcoming && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/70 p-6">
            <a
              className="btn-ghost btn-sm"
              target="_blank"
              rel="noreferrer"
              href={addToGoogleCalendarLink(`Tennis: ${b.title}`, b.starts_at, b.ends_at, `${settings.venue_name}, ${settings.venue_address}`, `${siteUrl()}/booking/${b.manage_token}`)}
            >
              Add to Google Calendar
            </a>
            {cancellable ? (
              <CancelBookingButton token={b.manage_token} amount={rand(b.amount_cents)} />
            ) : (
              <p className="text-sm text-slate-500">
                Online cancellation closes {settings.cancellation_hours}h before the lesson.
                {settings.contact_phone && <> Contact us on <a className="underline" href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a>.</>}
              </p>
            )}
          </div>
        )}
        {(b.status === "expired" || b.status === "pending") && (
          <div className="border-t border-slate-100 bg-slate-50/70 p-6">
            <Link href={b.kind === "group" ? `/groups/${b.group_session_id}` : "/book"} className="btn-primary btn-sm">Book again</Link>
          </div>
        )}
      </div>

      {!user && b.status === "confirmed" && (
        <div className="card mt-6 flex flex-col items-start gap-3 border-brand-200 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Keep track of your bookings</p>
            <p className="text-sm text-slate-600">Create a free account with <b>{b.customer_email}</b> and this booking will be saved to it.</p>
          </div>
          <Link href={`/login?email=${encodeURIComponent(b.customer_email)}&next=/account`} className="btn-primary btn-sm shrink-0">Create account</Link>
        </div>
      )}
      {user && <Link href="/account" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:underline">← All my bookings</Link>}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-semibold">{v}</dd>
    </div>
  );
}
