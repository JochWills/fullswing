const styles: Record<string, string> = {
  confirmed: "bg-ball-100 text-ball-700 ring-1 ring-inset ring-ball/40",
  pending: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300/60",
  cancelled: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  expired: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  scheduled: "bg-ball-100 text-ball-700 ring-1 ring-inset ring-ball/40",
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge capitalize ${styles[status] ?? "bg-slate-200"}`}>{status}</span>;
}
