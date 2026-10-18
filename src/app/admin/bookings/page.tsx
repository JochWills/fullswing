import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import RescheduleForm from "@/components/admin/RescheduleForm";
import { adminCancelBooking, adminRescheduleBooking, markRefundHandled } from "../actions";
import type { Booking } from "@/lib/types";

const TABS = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
  ["all", "All"],
] as const;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; error?: string; moved?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "upcoming";
  const now = new Date().toISOString();

  let query = db().from("bookings").select("*").limit(300);
  if (tab === "upcoming") query = query.eq("status", "confirmed").gte("ends_at", now).order("starts_at");
  else if (tab === "past") query = query.eq("status", "confirmed").lt("ends_at", now).order("starts_at", { ascending: false });
  else if (tab === "cancelled") query = query.eq("status", "cancelled").order("starts_at", { ascending: false });
  else query = query.in("status", ["confirmed", "cancelled"]).order("starts_at", { ascending: false });
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, "");
    query = query.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,player_name.ilike.%${q}%`);
  }
  const { data } = await query;
  const bookings = (data ?? []) as Booking[];

  return (
    <div>
      <Flash error={sp.error} success={sp.moved && `${sp.moved}'s booking was moved and they've been emailed the new time.`} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/admin/bookings?tab=${k}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === k ? "bg-white shadow" : "text-slate-600"}`}>
              {label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={sp.q} placeholder="Search name or email" className="input py-2 text-sm" />
          <button className="btn-dark btn-sm">Search</button>
        </form>
      </div>

      {bookings.length === 0 ? (
        <div className="card p-6 text-slate-600">No bookings here.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const future = new Date(b.starts_at) > new Date();
            return (
              <div key={b.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {fmtDate(b.starts_at, "EEE d MMM yyyy")} · {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}
                    </p>
                    <p className="text-sm">
                      <span className={`mr-2 badge ${b.kind === "group" ? "bg-ball/30 text-green-900" : "bg-brand-50 text-brand-700"}`}>
                        {b.kind === "group" ? "Group" : "Private"}
                      </span>
                      {b.title}{b.spots > 1 ? ` × ${b.spots}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <b>{b.customer_name}</b>{b.player_name ? ` (player: ${b.player_name})` : ""} · <a className="underline" href={`mailto:${b.customer_email}`}>{b.customer_email}</a>
                      {b.customer_phone && <> · <a className="underline" href={`tel:${b.customer_phone}`}>{b.customer_phone}</a></>}
                    </p>
                    {b.notes && <p className="mt-1 text-sm italic text-slate-500">“{b.notes}”</p>}
                    {b.rescheduled_from && b.status === "confirmed" && (
                      <p className="mt-1 text-xs font-semibold text-amber-700">Moved from {fmtDate(b.rescheduled_from, "EEE d MMM")} {fmtTime(b.rescheduled_from)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <StatusBadge status={b.status} />
                    <p className="mt-1 font-bold">{rand(b.amount_cents)}</p>
                    {b.refund_status !== "none" && <p className="text-xs text-slate-500">Refund: {b.refund_status}</p>}
                    {b.paystack_reference && <p className="text-xs text-slate-400">{b.paystack_reference}</p>}
                  </div>
                </div>
                {b.status === "confirmed" && future && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  {b.kind === "private" ? (
                    <RescheduleForm
                      action={adminRescheduleBooking}
                      id={b.id}
                      kind="private"
                      who={b.customer_name.split(" ")[0]}
                      defaultDate={fmtDate(b.starts_at, "yyyy-MM-dd")}
                      defaultStart={fmtTime(b.starts_at)}
                      defaultEnd={fmtTime(b.ends_at)}
                    />
                  ) : (
                    <Link href={`/admin/groups#${b.group_session_id}`} className="btn-ghost btn-sm">Reschedule session</Link>
                  )}
                  <form action={adminCancelBooking} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={b.id} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="refund" defaultChecked className="checkbox" /> Refund via Paystack
                    </label>
                    <ConfirmButton
                      title={`Cancel ${b.customer_name}'s booking?`}
                      message={<>{b.title} on {fmtDate(b.starts_at, "EEE d MMM")} at {fmtTime(b.starts_at)}. They&apos;ll get an email, and if &ldquo;Refund via Paystack&rdquo; is ticked their payment is refunded.</>}
                      confirmLabel="Cancel booking"
                      className="btn-ghost btn-sm text-red-600"
                    >
                      Cancel booking
                    </ConfirmButton>
                  </form>
                  </div>
                )}
                {b.refund_status === "failed" && (
                  <form action={markRefundHandled} className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 text-sm">
                    <input type="hidden" name="id" value={b.id} />
                    <span className="text-red-700">Automatic refund failed{b.refund_note ? `: ${b.refund_note}` : ""}. Refund in the Paystack dashboard, then</span>
                    <button className="btn-ghost btn-sm">Mark as refunded</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
