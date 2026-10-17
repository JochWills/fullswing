import { db } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import TimeOffForm from "@/components/admin/TimeOffForm";
import WeeklyHours from "@/components/admin/WeeklyHours";
import { addBlocked, addRule, deleteBlocked, deleteRule } from "../actions";
import type { AvailabilityRule, BlockedPeriod } from "@/lib/types";

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const [rulesRes, blockedRes] = await Promise.all([
    db().from("availability_rules").select("*").order("start_time"),
    db().from("blocked_periods").select("*").gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  const rules = (rulesRes.data ?? []) as AvailabilityRule[];
  const blocked = (blockedRes.data ?? []) as BlockedPeriod[];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="lg:col-span-2"><Flash error={sp.error} /></div>

      {/* Weekly hours */}
      <section>
        <h2 className="h-display text-3xl">Weekly hours</h2>
        <p className="mb-4 text-sm text-slate-600">Clients can book private lessons inside these times. Group sessions, blocked time and Google Calendar events are taken out automatically.</p>
        <WeeklyHours rules={rules} addRule={addRule} deleteRule={deleteRule} />
      </section>

      {/* Blocked time */}
      <section>
        <h2 className="h-display text-3xl">Time off</h2>
        <p className="mb-4 text-sm text-slate-600">Stop clients booking while you&apos;re away or busy.</p>

        <TimeOffForm action={addBlocked} />

        <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Coming up</h3>
        <div className="space-y-2">
          {blocked.map((b) => {
            const { when, length } = describeBlock(b);
            return (
              <form key={b.id} action={deleteBlocked} className="card flex items-center gap-4 p-3 text-sm">
                <input type="hidden" name="id" value={b.id} />
                <div className="w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 text-center">
                  <p className="bg-slate-700 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{fmtDate(b.starts_at, "MMM")}</p>
                  <p className="h-display py-0.5 text-xl">{fmtDate(b.starts_at, "d")}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{when}</p>
                  <p className="text-slate-500">
                    {length}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </p>
                </div>
                <ConfirmButton title="Remove this time off?" message={<>{when} · {length}. Clients will be able to book these times again.</>} confirmLabel="Remove">
                  Remove
                </ConfirmButton>
              </form>
            );
          })}
          {!blocked.length && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No time off planned.</p>}
        </div>
      </section>
    </div>
  );
}

/** Describe a blocked period the way it was entered: whole days, or hours on one day. */
function describeBlock(b: BlockedPeriod): { when: string; length: string } {
  const day = (iso: string | Date) => fmtDate(iso, "EEE d MMM");
  const midnight = (iso: string) => fmtTime(iso) === "00:00";
  if (midnight(b.starts_at) && midnight(b.ends_at)) {
    const lastDay = new Date(new Date(b.ends_at).getTime() - 86_400_000);
    const days = Math.round((new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 86_400_000);
    return days <= 1
      ? { when: day(b.starts_at), length: "All day" }
      : { when: `${day(b.starts_at)} – ${day(lastDay)}`, length: `${days} days` };
  }
  if (fmtDate(b.starts_at, "yyyy-MM-dd") === fmtDate(b.ends_at, "yyyy-MM-dd")) {
    return { when: day(b.starts_at), length: `${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}` };
  }
  return { when: `${fmtDateTime(b.starts_at)} → ${fmtDateTime(b.ends_at)}`, length: "Custom" };
}
