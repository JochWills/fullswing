import "server-only";
import { db } from "./supabase/admin";
import { fmtDate, fmtTime } from "./format";
import type { Booking } from "./types";

export type AdminNotification = {
  id: string;
  type: "booking" | "cancellation" | "refund";
  title: string;
  detail: string;
  at: string;
  unread: boolean;
  href: string;
};

const WINDOW_DAYS = 14;
const MAX_ITEMS = 8;

/**
 * Admin activity feed built from bookings: new paid bookings, client cancellations, and refunds that
 * failed and need handling. "Read" state is a timestamp in the admin's auth app_metadata, so it
 * follows them across devices without a table.
 */
export async function adminNotifications(userId: string): Promise<{ items: AdminNotification[]; unread: number }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const [{ data }, seenAt] = await Promise.all([
    db()
      .from("bookings")
      .select("id, kind, title, customer_name, player_name, spots, starts_at, status, created_at, paid_at, cancelled_at, cancelled_by, refund_status")
      .or(`and(status.eq.confirmed,created_at.gte.${since}),and(status.eq.cancelled,cancelled_at.gte.${since}),refund_status.eq.failed`)
      .order("created_at", { ascending: false })
      .limit(40),
    getSeenAt(userId),
  ]);

  const items: AdminNotification[] = [];
  for (const b of (data ?? []) as Booking[]) {
    const who = b.player_name || b.customer_name;
    const when = `${fmtDate(b.starts_at, "EEE d MMM")} · ${fmtTime(b.starts_at)}`;
    const search = encodeURIComponent(b.customer_name);
    if (b.refund_status === "failed") {
      items.push({
        id: `${b.id}-refund`,
        type: "refund",
        title: `Refund failed for ${b.customer_name}`,
        detail: `${b.title} · ${when} – refund manually`,
        at: b.cancelled_at ?? b.created_at,
        unread: true, // stays flagged until it's handled
        href: `/admin/bookings?tab=cancelled&q=${search}`,
      });
    } else if (b.status === "cancelled") {
      if (b.cancelled_by === "admin" || !b.cancelled_at) continue; // your own cancellations aren't news
      items.push({
        id: `${b.id}-cancel`,
        type: "cancellation",
        title: `${who} cancelled`,
        detail: `${b.title} · ${when}`,
        at: b.cancelled_at,
        unread: b.cancelled_at > seenAt,
        href: `/admin/bookings?tab=cancelled&q=${search}`,
      });
    } else {
      const at = b.paid_at ?? b.created_at;
      items.push({
        id: `${b.id}-booked`,
        type: "booking",
        title: `${who} booked${b.kind === "group" && b.spots > 1 ? ` ${b.spots} spots` : ""}`,
        detail: `${b.title} · ${when}`,
        at,
        unread: at > seenAt,
        href: `/admin/bookings?tab=all&q=${search}`,
      });
    }
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return { items: items.slice(0, MAX_ITEMS), unread: items.filter((i) => i.unread).length };
}

async function getSeenAt(userId: string): Promise<string> {
  const { data } = await db().auth.admin.getUserById(userId);
  return (data.user?.app_metadata?.notifications_seen_at as string | undefined) ?? "1970-01-01T00:00:00.000Z";
}

export async function markNotificationsRead(userId: string) {
  const { data } = await db().auth.admin.getUserById(userId);
  await db().auth.admin.updateUserById(userId, {
    app_metadata: { ...(data.user?.app_metadata ?? {}), notifications_seen_at: new Date().toISOString() },
  });
}
