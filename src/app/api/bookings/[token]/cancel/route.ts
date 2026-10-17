import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/admin";
import { BookingError, canClientCancel, cancelBooking } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return Response.json({ error: "Not found" }, { status: 404 });

  const { data } = await db().from("bookings").select("*").eq("manage_token", token).maybeSingle();
  const b = data as Booking | null;
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  if (!canClientCancel(b, settings.cancellation_hours)) {
    return Response.json(
      { error: `Bookings can only be cancelled online up to ${settings.cancellation_hours} hours before the lesson. Please contact us directly.` },
      { status: 400 },
    );
  }

  try {
    await cancelBooking(b, "client", { refund: true });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingError) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "Could not cancel. Please try again." }, { status: 500 });
  }
}
