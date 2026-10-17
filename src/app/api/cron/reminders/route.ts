import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { sendReminder } from "@/lib/email";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await db().rpc("expire_stale_pending");

  const now = Date.now();
  const { data } = await db()
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 24 * 3_600_000).toISOString());

  const settings = await getSettings();
  let sent = 0;
  for (const b of (data ?? []) as Booking[]) {
    // Skip reminders for lessons booked within the last few hours - they just got a confirmation.
    if (now - new Date(b.created_at).getTime() < 6 * 3_600_000) continue;
    const { data: claimed } = await db()
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("reminder_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    await sendReminder(b, settings);
    sent++;
  }
  return Response.json({ ok: true, sent });
}

export const GET = run;
export const POST = run;
