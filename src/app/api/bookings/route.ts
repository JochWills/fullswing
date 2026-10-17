import { NextRequest } from "next/server";
import { BookingError, createGroupBooking, createPrivateBooking, parseCustomer } from "@/lib/bookings";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const customer = parseCustomer(body);
    if (body.acceptPolicy !== true) throw new BookingError("Please accept the cancellation policy.");
    const user = await getUser();

    if (body.type === "private") {
      const result = await createPrivateBooking(String(body.lessonTypeId), String(body.startsAt), customer, user);
      return Response.json(result);
    }
    if (body.type === "group") {
      const result = await createGroupBooking(String(body.sessionId), Number(body.spots ?? 1), customer, user);
      return Response.json(result);
    }
    throw new BookingError("Unknown booking type.");
  } catch (e) {
    if (e instanceof BookingError) return Response.json({ error: e.message }, { status: 400 });
    console.error("Booking failed", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
