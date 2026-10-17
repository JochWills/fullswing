"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDismiss } from "./ui/popover";
import Spinner from "./ui/Spinner";
import type { AdminNotification } from "@/lib/notifications";

type Feed = { items: AdminNotification[]; unread: number };

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
};

/** Avatar dropdown for signed-in users. Admins also get the dashboard links and a notifications feed. */
export default function ProfileMenu({ email, admin }: { email: string; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed | null>(null);
  // Items that were unread when the menu was opened stay highlighted while it's open.
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (res.ok) setFeed(await res.json());
    } catch {}
  }, []);

  // Fetch in the background (never blocks the page), refresh every minute and when the tab regains focus.
  useEffect(() => {
    if (!admin) return;
    load();
    const t = setInterval(load, 60_000);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [admin, load]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && admin && feed?.unread) {
      setHighlight(new Set(feed.items.filter((i) => i.unread).map((i) => i.id)));
      // Opening the menu counts as seeing them; failed refunds stay flagged until handled.
      setFeed({ items: feed.items.map((i) => (i.type === "refund" ? i : { ...i, unread: false })), unread: feed.items.filter((i) => i.type === "refund").length });
      fetch("/api/admin/notifications", { method: "POST" }).catch(() => {});
    }
  }

  const unread = feed?.unread ?? 0;
  const initial = email.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread ? `Account menu, ${unread} new notification${unread === 1 ? "" : "s"}` : "Account menu"}
        className={`relative flex items-center gap-2 rounded-full border bg-white p-1 pr-2.5 shadow-sm transition hover:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${
          open ? "border-brand" : "border-slate-200"
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">
          {initial}
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-40" aria-hidden />
            <span className="relative">{unread > 9 ? "9+" : unread}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="fixed inset-x-4 top-[80px] z-50 text-ink max-h-[calc(100vh-96px)] origin-top-right animate-fade-in overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-lift md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:max-h-none md:w-[22rem] md:overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white">{initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{email}</p>
              <p className="text-xs text-slate-500">{admin ? "Coach · Admin" : "Signed in"}</p>
            </div>
          </div>

          {admin && (
            <div className="border-b border-slate-100">
              <div className="flex items-center justify-between px-5 pb-1 pt-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Notifications</p>
                {feed && feed.items.length > 0 && <span className="text-xs text-slate-400">Last 14 days</span>}
              </div>
              <div className="max-h-80 overflow-y-auto overscroll-contain px-2 pb-2">
                {!feed ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                    <Spinner /> Loading…
                  </div>
                ) : feed.items.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
                ) : (
                  feed.items.map((n) => {
                    const fresh = highlight.has(n.id) || n.type === "refund";
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        role="menuitem"
                        onClick={close}
                        className={`flex gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-50 ${fresh ? "bg-brand-50/60" : ""}`}
                      >
                        <NotificationIcon type={n.type} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={`text-sm ${fresh ? "font-bold" : "font-semibold"} ${n.type === "refund" ? "text-red-700" : ""}`}>{n.title}</span>
                            <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">{ago(n.at)}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">{n.detail}</span>
                        </span>
                        {fresh && <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.type === "refund" ? "bg-red-500" : "bg-brand"}`} aria-label="New" />}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <nav className="p-2 text-sm font-semibold">
            {admin && (
              <>
                <MenuLink href="/admin" onClick={close} icon={<path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-3H4z" />}>Admin dashboard</MenuLink>
                <MenuLink href="/admin/bookings" onClick={close} icon={<><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>}>Bookings</MenuLink>
              </>
            )}
            <MenuLink href="/account" onClick={close} icon={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>}>My bookings</MenuLink>
            <form action="/auth/signout" method="post" className="mt-1 border-t border-slate-100 pt-1">
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 transition hover:bg-red-50 hover:text-red-700">
                <MenuIcon><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></MenuIcon>
                Sign out
              </button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, onClick, icon, children }: { href: string; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
      <MenuIcon>{icon}</MenuIcon>
      {children}
    </Link>
  );
}

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function NotificationIcon({ type }: { type: AdminNotification["type"] }) {
  const styles = {
    booking: ["bg-ball-50 text-ball-700", <path key="p" d="M5 12l5 5 9-10" />],
    cancellation: ["bg-slate-100 text-slate-500", <path key="p" d="M6 6l12 12M18 6L6 18" />],
    refund: ["bg-red-50 text-red-600", <path key="p" d="M12 8v5M12 16.5v.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />],
  } as const;
  const [cls, path] = styles[type];
  return (
    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {path}
      </svg>
    </span>
  );
}
