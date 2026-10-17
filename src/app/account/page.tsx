import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import type { Booking } from "@/lib/types";

export const metadata = { title: "My bookings" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  // RLS: only bookings linked to this user are returned.
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .in("status", ["confirmed", "cancelled"])
    .order("starts_at", { ascending: false });
  const all = (data ?? []) as Booking[];
  const now = new Date();
  const upcoming = all.filter((b) => b.status === "confirmed" && new Date(b.ends_at) > now).reverse();
  const past = all.filter((b) => !(b.status === "confirmed" && new Date(b.ends_at) > now));

  return (
    <div className="container-x max-w-3xl py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow"><span className="h-1.5 w-6 rounded-full bg-brand" />Your account</p>
          <h1 className="h-display mt-3 text-5xl sm:text-6xl">My bookings</h1>
          <p className="mt-1 text-slate-600">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost btn-sm">Sign out</button>
        </form>
      </div>

      <h2 className="h-display mb-4 mt-10 text-3xl">Upcoming</h2>
      {upcoming.length ? (
        <div className="space-y-3">{upcoming.map((b) => <Row key={b.id} b={b} />)}</div>
      ) : (
        <div className="card px-6 py-10 text-center">
          <p className="h-display text-2xl">No upcoming lessons</p>
          <p className="mt-1 text-slate-600">Time to get back on court.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/book" className="btn-primary btn-sm">Book a lesson</Link>
            <Link href="/groups" className="btn-ghost btn-sm">Group sessions</Link>
          </div>
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="h-display mb-4 mt-12 text-3xl">Past & cancelled</h2>
          <div className="space-y-3 opacity-80">{past.map((b) => <Row key={b.id} b={b} />)}</div>
        </>
      )}
    </div>
  );
}

function Row({ b }: { b: Booking }) {
  return (
    <Link href={`/booking/${b.manage_token}`} className="card card-hover flex items-center gap-4 p-4">
      <div className="w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 text-center">
        <p className="bg-brand py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{fmtDate(b.starts_at, "MMM")}</p>
        <p className="h-display py-1 text-2xl">{fmtDate(b.starts_at, "d")}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{b.title}</p>
        <p className="text-sm text-slate-600">{fmtDate(b.starts_at, "EEE")} · {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}{b.player_name ? ` · ${b.player_name}` : ""}</p>
      </div>
      <div className="text-right">
        <StatusBadge status={b.status} />
        <p className="mt-1 text-sm font-semibold">{rand(b.amount_cents)}</p>
      </div>
    </Link>
  );
}
