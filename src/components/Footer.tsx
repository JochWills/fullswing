import Link from "next/link";
import { getSettings } from "@/lib/data";
import Logo from "./Logo";

export default async function Footer() {
  let s = null;
  try {
    s = await getSettings();
  } catch {}
  return (
    <footer className="mt-24 bg-ink text-slate-400">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block rounded-2xl bg-white px-5 py-4 shadow-lift" aria-label="Full-Swing Tennis Academy home">
            <Logo className="h-24 w-auto" />
          </Link>
          <p className="mt-5 max-w-xs text-sm">Private coaching and group sessions for juniors and adults in St Francis Bay.</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white">Where</p>
          <p className="text-slate-300">{s?.venue_name ?? "St Francis Bay Tennis Court"}</p>
          <p>{s?.venue_address}</p>
          {(s?.contact_email || s?.contact_phone) && (
            <div className="mt-4 flex flex-col gap-1">
              {s?.contact_email && <a href={`mailto:${s.contact_email}`} className="hover:text-white">{s.contact_email}</a>}
              {s?.contact_phone && <a href={`tel:${s.contact_phone}`} className="hover:text-white">{s.contact_phone}</a>}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-white">Bookings</p>
          <Link href="/book" className="hover:text-white">Private lessons</Link>
          <Link href="/groups" className="hover:text-white">Group sessions</Link>
          <Link href="/account" className="hover:text-white">My bookings</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Full-Swing Tennis Academy</p>
          <p>Payments secured by Paystack</p>
        </div>
      </div>
    </footer>
  );
}
