import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { withSpotsLeft } from "@/lib/data";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import NumberField from "@/components/ui/NumberField";
import { cancelGroupSession, createGroupSession, deleteGroupSession, updateGroupSession } from "../actions";
import type { Booking, GroupSession } from "@/lib/types";

export default async function AdminGroups({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; updated?: string; past?: string }>;
}) {
  const sp = await searchParams;
  const past = sp.past === "1";
  const now = new Date().toISOString();

  let q = db().from("group_sessions").select("*").eq("status", "scheduled");
  q = past ? q.lt("ends_at", now).order("starts_at", { ascending: false }).limit(50) : q.gte("ends_at", now).order("starts_at");
  const { data } = await q;
  const sessions = await withSpotsLeft((data ?? []) as GroupSession[]);

  const { data: bookingRows } = sessions.length
    ? await db().from("bookings").select("*").in("group_session_id", sessions.map((s) => s.id)).eq("status", "confirmed").order("created_at")
    : { data: [] };
  const attendees = new Map<string, Booking[]>();
  for (const b of (bookingRows ?? []) as Booking[]) {
    attendees.set(b.group_session_id!, [...(attendees.get(b.group_session_id!) ?? []), b]);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="lg:col-span-2">
        <Flash
          error={sp.error}
          success={sp.saved ? `${sp.saved} session${sp.saved === "1" ? "" : "s"} created.` : sp.updated && "Session updated."}
        />
      </div>

      <section className="order-2 lg:order-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="h-display text-3xl">{past ? "Past sessions" : "Upcoming sessions"}</h2>
          <Link href={past ? "/admin/groups" : "/admin/groups?past=1"} className="text-sm font-semibold text-brand-600 hover:underline">
            {past ? "Show upcoming" : "Show past"}
          </Link>
        </div>
        <div className="space-y-4">
          {sessions.map((s) => {
            const list = attendees.get(s.id) ?? [];
            const booked = s.capacity - s.spots_left;
            return (
              <div key={s.id} id={s.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold">{s.title}{s.level ? <span className="font-normal text-slate-500"> · {s.level}</span> : null}</p>
                    <p className="text-sm text-slate-600">{fmtDate(s.starts_at, "EEE d MMM yyyy")} · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)} · {rand(s.price_cents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="h-display text-2xl">{booked}/{s.capacity}</p>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full bg-ball" style={{ width: `${Math.min(100, (booked / s.capacity) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {list.length > 0 && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50 text-sm">
                    {list.map((b) => (
                      <li key={b.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                        <span><b>{b.player_name || b.customer_name}</b>{b.spots > 1 ? ` (+${b.spots - 1})` : ""}{b.player_name ? <span className="text-slate-500"> – booked by {b.customer_name}</span> : null}</span>
                        <span className="text-slate-500">{b.customer_phone || b.customer_email}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!past && (
                  <details className="border-t border-slate-100">
                    <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-brand-600">Edit / cancel</summary>
                    <div className="space-y-4 p-4 pt-0">
                      <form action={updateGroupSession} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={s.id} />
                        <div className="sm:col-span-2"><label className="label">Title</label><input name="title" className="input" defaultValue={s.title} required /></div>
                        <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" className="input" defaultValue={s.description ?? ""} /></div>
                        <div><label className="label">Level</label><input name="level" className="input" defaultValue={s.level ?? ""} /></div>
                        <div><label className="label">Capacity</label><NumberField name="capacity" min={Math.max(1, booked)} max={100} defaultValue={s.capacity} /></div>
                        <div><label className="label">Price (R)</label><NumberField name="price" min={0} step="0.01" buttonStep={10} prefix="R" defaultValue={s.price_cents / 100} /></div>
                        <div className="flex items-end"><SubmitButton className="btn-dark w-full">Save changes</SubmitButton></div>
                        <p className="text-xs text-slate-500 sm:col-span-2">To change the date or time, cancel this session and create a new one.</p>
                      </form>
                      {list.length ? (
                        <form action={cancelGroupSession} className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 p-3">
                          <input type="hidden" name="id" value={s.id} />
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="refund" defaultChecked className="checkbox" /> Refund everyone</label>
                          <ConfirmButton
                            title="Cancel this session?"
                            message={<>{list.length} booking{list.length === 1 ? "" : "s"} will be cancelled and everyone will get an email. If &ldquo;Refund everyone&rdquo; is ticked, they&apos;ll be refunded too.</>}
                            confirmLabel="Cancel session"
                            cancelLabel="Keep session"
                            className="btn-danger btn-sm"
                          >
                            Cancel session
                          </ConfirmButton>
                        </form>
                      ) : (
                        <form action={deleteGroupSession}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton
                            title="Delete this session?"
                            message={<>&ldquo;{s.title}&rdquo; on {fmtDate(s.starts_at, "EEE d MMM")} has no bookings, so it will be removed completely.</>}
                            confirmLabel="Delete session"
                            className="btn-danger btn-sm"
                          >
                            Delete session
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
          {!sessions.length && <div className="card p-6 text-slate-600">No {past ? "past" : "upcoming"} group sessions.</div>}
        </div>
      </section>

      <section className="order-1 lg:order-2">
        <form action={createGroupSession} className="card space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="h-display text-2xl">New group session</h2>
          <div><label className="label">Title</label><input name="title" className="input" placeholder="Junior Squad (8–12 yrs)" required /></div>
          <div><label className="label">Description</label><textarea name="description" className="input" placeholder="What to expect, what to bring…" /></div>
          <div><label className="label">Level</label><input name="level" className="input" placeholder="Beginner / Intermediate / All levels" /></div>
          <div><label className="label">Date</label><DatePicker name="date" min="today" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start</label><TimePicker name="start_time" required /></div>
            <div><label className="label">End</label><TimePicker name="end_time" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Max players</label><NumberField name="capacity" min={1} max={100} defaultValue={6} required /></div>
            <div><label className="label">Price (R)</label><NumberField name="price" min={0} step="0.01" buttonStep={10} prefix="R" placeholder="0" required /></div>
          </div>
          <div>
            <label className="label">Repeat weekly</label>
            <Select
              name="repeat_weeks"
              defaultValue="1"
              options={[{ value: "1", label: "Just this date" }, ...[2, 3, 4, 6, 8, 10, 12].map((n) => ({ value: String(n), label: `${n} weeks` }))]}
            />
            <p className="mt-1 text-xs text-slate-500">Creates separate one-off sessions on the same weekday.</p>
          </div>
          <SubmitButton className="btn-primary w-full">Create session</SubmitButton>
        </form>
      </section>
    </div>
  );
}
