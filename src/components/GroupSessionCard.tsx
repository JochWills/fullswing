import Link from "next/link";
import { fmtDate, fmtTime, rand } from "@/lib/format";
import type { GroupSession } from "@/lib/types";

export default function GroupSessionCard({ s }: { s: GroupSession & { spots_left: number } }) {
  const full = s.spots_left <= 0;
  return (
    <div className="card card-hover flex flex-col p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="w-16 overflow-hidden rounded-2xl border border-slate-200 text-center shadow-sm">
          <p className="bg-brand py-1 text-[11px] font-bold uppercase tracking-wider text-white">{fmtDate(s.starts_at, "MMM")}</p>
          <p className="h-display py-1.5 text-3xl">{fmtDate(s.starts_at, "d")}</p>
        </div>
        {full ? (
          <span className="badge bg-slate-200 text-slate-600">Full</span>
        ) : (
          <span className={`badge ${s.spots_left <= 2 ? "bg-amber-100 text-amber-800" : "bg-ball/20 text-green-800"}`}>
            {s.spots_left} spot{s.spots_left === 1 ? "" : "s"} left
          </span>
        )}
      </div>
      <h3 className="h-display text-3xl">{s.title}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-600">
        {fmtDate(s.starts_at, "EEEE")} · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}
        {s.level ? ` · ${s.level}` : ""}
      </p>
      {s.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{s.description}</p>}
      <div className="h-6 shrink-0" />
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
        <p className="h-display text-3xl">{rand(s.price_cents)}</p>
        {full ? (
          <span className="btn-ghost btn-sm pointer-events-none opacity-60">Sold out</span>
        ) : (
          <Link href={`/groups/${s.id}`} className="btn-primary btn-sm">
            Book a spot
          </Link>
        )}
      </div>
    </div>
  );
}
