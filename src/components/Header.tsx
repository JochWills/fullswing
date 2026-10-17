import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import Logo from "./Logo";
import ProfileMenu from "./ProfileMenu";

export default async function Header() {
  const user = await getViewer();
  const admin = isAdminEmail(user?.email);

  // Account links (My bookings, Admin, Sign out) live in the profile menu once signed in.
  const links: [string, string][] = [
    ["/book", "Private lessons"],
    ["/groups", "Group sessions"],
    ...(user ? [] : [["/login", "Sign in"] as [string, string]]),
  ];
  const profile = user && <ProfileMenu email={user.email ?? ""} admin={admin} />;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="container-x flex h-[72px] items-center justify-between gap-4 sm:h-24">
        <Link href="/" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Full-Swing Tennis Academy home">
          <Logo className="h-14 w-auto sm:h-[76px]" priority />
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="nav-link">
              {label}
            </Link>
          ))}
          {!admin && (
            <Link href="/book" className="btn-primary btn-sm ml-2">
              Book now
            </Link>
          )}
          {profile && <div className="ml-2">{profile}</div>}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {!admin && (
            <Link href="/book" className="btn-primary btn-sm">
              Book now
            </Link>
          )}
          {profile}
          <details className="group relative">
            <summary
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 group-open:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg viewBox="0 0 24 24" className="hidden h-5 w-5 group-open:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-ink shadow-lift">
              {links.map(([href, label]) => (
                <Link key={href} href={href} className="block rounded-xl px-4 py-3 font-semibold hover:bg-slate-50">
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
