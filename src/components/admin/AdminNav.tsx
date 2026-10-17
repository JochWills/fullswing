"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/admin", "Overview"],
  ["/admin/bookings", "Bookings"],
  ["/admin/availability", "Availability"],
  ["/admin/groups", "Group sessions"],
  ["/admin/lessons", "Lesson types"],
  ["/admin/settings", "Settings"],
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-fit sm:rounded-full sm:border sm:border-slate-200 sm:bg-white sm:p-1 sm:shadow-sm">
      {items.map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
