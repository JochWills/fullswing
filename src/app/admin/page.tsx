import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/supabase/admin";
import { TZ } from "@/lib/env";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import { withSpotsLeft } from "@/lib/data";
import type { Booking, GroupSession } from "@/lib/types";

export default async function AdminOverview() {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = new Date(formatInTimeZone(now, TZ, "yyyy-MM-01'T'00:00:00XXX"));

  const [bookingsRes, sessionsRes, monthRes, upcomingCount] = await Promise.all([
    db().from("bookings").select("*").eq("status", "confirmed").eq("kind", "private")
      .gte("ends_at", now.toISOString()).lte("starts_at", weekAhead.toISOString()).order("starts_at"),
    db().from("group_sessions").select("*").eq("status", "scheduled")
      .gte("ends_at", now.toISOString()).lte("starts_at", weekAhead.toISOString()).order("starts_at"),
    db().from("bookings").select("amount_cents, refund_status").eq("status", "confirmed").gte("paid_at", monthStart.toISOString()),
    db().from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("starts_at", now.toISOString()),
  ]);

  const privates = (bookingsRes.data ?? []) as Booking[];
  const sessions = await withSpotsLeft((sessionsRes.data ?? []) as GroupSession[]);
  const revenue = ((monthRes.data ?? []) as { amount_cents: number }[]).reduce((a, b) => a + b.amount_cents, 0);

  type Item = { start: string; end: string; title: string; sub: string; href: string; group: boolean };
  const items: Item[] = [
    ...privates.map((b) => ({
      start: b.starts_at, end: b.ends_at, title: b.player_name || b.customer_name, sub: b.title, href: "/admin/bookings", group: false,
    })),
    ...sessions.map((s) => ({
      start: s.starts_at, end: s.ends_at, title: s.title, sub: `${s.capacity - s.spots_left}/${s.capacity} booked`, href: `/admin/groups#${s.id}`, group: true,
    })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const byDay = new Map<string, Item[]>();
  for (const it of items) {
    const k = formatInTimeZone(it.start, TZ, "yyyy-MM-dd");
    byDay.set(k, [...(byDay.get(k) ?? []), it]);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming bookings" value={String(upcomingCount.count ?? 0)} />
        <Stat label="Next 7 days" value={`${items.length} on court`} />
        <Stat label={`Takings ${fmtDate(now, "MMMM")}`} value={rand(revenue)} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="h-display text-3xl">This week</h2>
          <div className="flex gap-2">
            <Link href="/admin/availability" className="btn-ghost btn-sm">Block time off</Link>
            <Link href="/admin/groups" className="btn-primary btn-sm">+ Group session</Link>
          </div>
        </div>
        {byDay.size === 0 ? (
          <div className="card p-6 text-slate-600">Nothing booked in the next 7 days.</div>
        ) : (
          <div className="space-y-4">
            {[...byDay.entries()].map(([day, list]) => (
              <div key={day} className="card overflow-hidden">
                <p className="bg-slate-100 px-4 py-2 text-sm font-bold">{fmtDate(list[0].start, "EEEE d MMMM")}</p>
                <ul className="divide-y divide-slate-100">
                  {list.map((it, i) => (
                    <li key={i}>
                      <Link href={it.href} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                        <span className="w-24 shrink-0 text-sm font-bold tabular-nums">{fmtTime(it.start)}–{fmtTime(it.end)}</span>
                        <span className={`h-8 w-1 rounded-full ${it.group ? "bg-ball" : "bg-brand"}`} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{it.title}</span>
                          <span className="block text-sm text-slate-500">{it.sub}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="h-display mt-1 text-4xl">{value}</p>
    </div>
  );
}
