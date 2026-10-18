import "server-only";
import { db } from "./supabase/admin";
import { getLessonType, getSettings, isSlotAvailable } from "./data";
import { paymentsTestMode, siteUrl } from "./env";
import { initializeTransaction, newReference, refundTransaction, verifyTransaction } from "./paystack";
import { createEvent, deleteEvent, moveEvent } from "./google";
import { sendAdminNewBooking, sendBookingConfirmation, sendCancellation, sendRefundIssue, sendRescheduled } from "./email";
import { fmtTime, rand } from "./format";
import type { Booking, GroupSession } from "./types";

export class BookingError extends Error {}

export type CustomerInput = {
  name: string;
  email: string;
  phone?: string;
  playerName?: string;
  notes?: string;
};

const clean = (s: unknown, max = 200) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export function parseCustomer(body: Record<string, unknown>): CustomerInput {
  const c = {
    name: clean(body.name, 120),
    email: clean(body.email, 200).toLowerCase(),
    phone: clean(body.phone, 40),
    playerName: clean(body.playerName, 120),
    notes: clean(body.notes, 1000),
  };
  if (c.name.length < 2) throw new BookingError("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new BookingError("Please enter a valid email address.");
  return c;
}

async function linkedUserId(email: string, sessionUser?: { id: string; email?: string | null } | null) {
  if (sessionUser && sessionUser.email?.toLowerCase() === email) return sessionUser.id;
  const { data } = await db().rpc("user_id_for_email", { p_email: email });
  return (data as string | null) ?? null;
}

/** Creates a pending booking and returns where to send the client next. */
export async function createPrivateBooking(
  lessonTypeId: string,
  startIso: string,
  c: CustomerInput,
  sessionUser?: { id: string; email?: string | null } | null,
): Promise<{ redirectUrl: string }> {
  const lesson = await getLessonType(lessonTypeId);
  if (!lesson) throw new BookingError("That lesson type is no longer available.");
  if (!(await isSlotAvailable(lesson, startIso))) {
    throw new BookingError("Sorry, that time has just been taken. Please choose another slot.");
  }

  const start = new Date(startIso);
  const end = new Date(start.getTime() + lesson.duration_minutes * 60_000);
  const reference = newReference();

  const { data, error } = await db()
    .from("bookings")
    .insert({
      kind: "private",
      lesson_type_id: lesson.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      title: lesson.name,
      customer_name: c.name,
      customer_email: c.email,
      customer_phone: c.phone || null,
      player_name: c.playerName || null,
      notes: c.notes || null,
      user_id: await linkedUserId(c.email, sessionUser),
      amount_cents: lesson.price_cents,
      paystack_reference: reference,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23P01") throw new BookingError("Sorry, that time has just been taken. Please choose another slot.");
    throw error;
  }
  return startPayment(data as Booking);
}

export async function createGroupBooking(
  sessionId: string,
  spots: number,
  c: CustomerInput,
  sessionUser?: { id: string; email?: string | null } | null,
): Promise<{ redirectUrl: string }> {
  if (!Number.isInteger(spots) || spots < 1 || spots > 10) throw new BookingError("Choose between 1 and 10 spots.");
  const { data, error } = await db().rpc("book_group_session", {
    p_session_id: sessionId,
    p_spots: spots,
    p_customer_name: c.name,
    p_customer_email: c.email,
    p_customer_phone: c.phone || null,
    p_player_name: c.playerName || null,
    p_notes: c.notes || null,
    p_user_id: await linkedUserId(c.email, sessionUser),
    p_reference: newReference(),
  });
  if (error) {
    if (error.message.includes("SESSION_FULL")) throw new BookingError("Sorry, there aren't enough spots left in this session.");
    if (error.message.includes("SESSION_STARTED")) throw new BookingError("This session has already started.");
    if (error.message.includes("SESSION_UNAVAILABLE")) throw new BookingError("This session is no longer available.");
    throw error;
  }
  return startPayment(data as Booking);
}

async function startPayment(b: Booking): Promise<{ redirectUrl: string }> {
  // Free lessons or test mode: confirm straight away.
  if (b.amount_cents === 0 || paymentsTestMode()) {
    await markConfirmed(b, null);
    return { redirectUrl: `/booking/${b.manage_token}?new=1` };
  }
  try {
    const tx = await initializeTransaction({
      email: b.customer_email,
      amountCents: b.amount_cents,
      reference: b.paystack_reference!,
      callbackUrl: `${siteUrl()}/booking/callback`,
      metadata: {
        booking_id: b.id,
        custom_fields: [
          { display_name: "Booking", variable_name: "booking", value: b.title },
          { display_name: "Client", variable_name: "client", value: b.customer_name },
        ],
      },
    });
    return { redirectUrl: tx.authorization_url };
  } catch (e) {
    // Release the hold so the slot isn't blocked for 20 minutes.
    await db().from("bookings").update({ status: "expired" }).eq("id", b.id);
    console.error(e);
    throw new BookingError("We couldn't start the payment. Please try again in a moment.");
  }
}

/**
 * Atomically flips a booking to confirmed. Only the caller that wins the update
 * sends emails / creates calendar events, so the webhook and the redirect can race safely.
 */
async function markConfirmed(b: Booking, paidAt: string | null): Promise<Booking | null> {
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "confirmed", paid_at: paidAt ?? new Date().toISOString() })
    .eq("id", b.id)
    .in("status", ["pending", "expired"])
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const confirmed = data as Booking;
  await afterConfirmed(confirmed);
  return confirmed;
}

async function afterConfirmed(b: Booking) {
  const settings = await getSettings();
  if (b.kind === "private") {
    const eventId = await createEvent({
      summary: `🎾 ${b.player_name || b.customer_name} – ${b.title}`,
      description: [
        `Client: ${b.customer_name}`,
        `Email: ${b.customer_email}`,
        `Phone: ${b.customer_phone || "-"}`,
        b.player_name ? `Player: ${b.player_name}` : "",
        b.notes ? `Notes: ${b.notes}` : "",
        `Paid: ${rand(b.amount_cents)}`,
        `Admin: ${siteUrl()}/admin/bookings`,
      ]
        .filter(Boolean)
        .join("\n"),
      location: `${settings.venue_name}, ${settings.venue_address}`,
      start: b.starts_at,
      end: b.ends_at,
      appEventId: b.id,
    });
    if (eventId) {
      await db().from("bookings").update({ google_event_id: eventId }).eq("id", b.id);
      b.google_event_id = eventId;
    }
  }
  await Promise.all([sendBookingConfirmation(b, settings), sendAdminNewBooking(b, settings)]);
}

/** Called from the Paystack redirect and the webhook. Safe to call many times. */
export async function confirmByReference(reference: string): Promise<Booking | null> {
  const { data } = await db().from("bookings").select("*").eq("paystack_reference", reference).maybeSingle();
  const b = data as Booking | null;
  if (!b) return null;
  if (b.status === "confirmed" || b.status === "cancelled") return b;

  const tx = await verifyTransaction(reference);
  if (tx.status !== "success" || tx.currency !== "ZAR" || tx.amount < b.amount_cents) {
    return b; // not paid (yet)
  }

  // If the hold expired before payment completed, make sure the place is still free.
  if (b.status === "expired" && !(await stillAvailable(b))) {
    await refundUnfulfillable(b);
    return { ...b, status: "cancelled" };
  }

  try {
    const confirmed = await markConfirmed(b, tx.paid_at);
    if (confirmed) return confirmed;
  } catch (e: unknown) {
    // Exclusion constraint: someone else took the private slot meanwhile.
    if ((e as { code?: string }).code === "23P01") {
      await refundUnfulfillable(b);
      return { ...b, status: "cancelled" };
    }
    throw e;
  }
  const { data: fresh } = await db().from("bookings").select("*").eq("id", b.id).single();
  return fresh as Booking;
}

async function stillAvailable(b: Booking): Promise<boolean> {
  if (b.kind === "private") return true; // the exclusion constraint decides atomically
  const { data: s } = await db().from("group_sessions").select("*").eq("id", b.group_session_id!).single();
  const session = s as GroupSession | null;
  if (!session || session.status !== "scheduled") return false;
  const { data: taken } = await db().rpc("group_session_taken", { p_session_ids: [session.id] });
  const used = Number(((taken ?? []) as { taken: number }[])[0]?.taken ?? 0);
  return used + b.spots <= session.capacity;
}

async function refundUnfulfillable(b: Booking) {
  let refund_status: Booking["refund_status"] = "pending";
  try {
    await refundTransaction(b.paystack_reference!, "Slot no longer available");
  } catch (e) {
    console.error(e);
    refund_status = "failed";
  }
  await db()
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "system",
      refund_status,
      refund_note: "Paid after the slot was taken - auto refund",
    })
    .eq("id", b.id);
  await sendRefundIssue(b, await getSettings());
}

export function canClientCancel(b: Booking, cancellationHours: number, now = new Date()): boolean {
  if (b.status !== "confirmed" && b.status !== "pending") return false;
  // The coach moved it, so the client didn't choose this time: they may cancel right up to the start.
  if (b.rescheduled_at) return new Date(b.starts_at) > now;
  return new Date(b.starts_at).getTime() - now.getTime() >= cancellationHours * 3_600_000;
}

/** Cancels a booking, refunds through Paystack when asked, removes the calendar event and emails the client. */
export async function cancelBooking(
  b: Booking,
  by: "client" | "admin" | "system",
  opts: { refund: boolean; silent?: boolean },
): Promise<Booking> {
  const wasPaid = b.status === "confirmed" && b.amount_cents > 0 && !!b.paid_at;
  let refund_status: Booking["refund_status"] = "none";
  let refund_note: string | null = null;
  let refundText = "No payment was taken for this booking.";

  if (wasPaid && opts.refund) {
    if (paymentsTestMode() || !b.paystack_reference) {
      refund_status = "manual";
      refund_note = "Test mode - no real payment to refund";
      refundText = "This booking was made in test mode, so no money was taken.";
    } else {
      try {
        await refundTransaction(b.paystack_reference, `Cancelled by ${by}`);
        refund_status = "pending";
        refundText = `A full refund of ${rand(b.amount_cents)} has been issued to your card. It usually reflects within 5–10 working days.`;
      } catch (e) {
        console.error(e);
        refund_status = "failed";
        refund_note = (e as Error).message;
        refundText = "We'll process your refund manually and be in touch shortly.";
      }
    }
  } else if (wasPaid) {
    refund_status = "none";
    refundText = "As this was cancelled inside the cancellation window, no refund applies.";
  }

  const { data, error } = await db()
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: by,
      refund_status,
      refund_note,
    })
    .eq("id", b.id)
    .in("status", ["pending", "confirmed"])
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new BookingError("This booking can no longer be cancelled.");

  const cancelled = data as Booking;
  await deleteEvent(b.google_event_id);
  if (b.status === "confirmed" && !opts.silent) {
    await sendCancellation(cancelled, await getSettings(), refundText);
  }
  return cancelled;
}

/**
 * Describes what a time range would clash with on court (private lessons, group sessions, time off),
 * ignoring the booking / session being moved. Returns null when the court is free.
 */
async function courtClash(start: Date, end: Date, ignore: { bookingId?: string; sessionId?: string }): Promise<string | null> {
  const from = start.toISOString();
  const to = end.toISOString();
  const holdCutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  let privates = db()
    .from("bookings")
    .select("starts_at, customer_name, player_name")
    .eq("kind", "private")
    .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${holdCutoff})`)
    .lt("starts_at", to)
    .gt("ends_at", from);
  if (ignore.bookingId) privates = privates.neq("id", ignore.bookingId);
  let sessions = db().from("group_sessions").select("starts_at, title").eq("status", "scheduled").lt("starts_at", to).gt("ends_at", from);
  if (ignore.sessionId) sessions = sessions.neq("id", ignore.sessionId);
  const [p, g, t] = await Promise.all([
    privates.limit(1),
    sessions.limit(1),
    db().from("blocked_periods").select("starts_at, reason").lt("starts_at", to).gt("ends_at", from).limit(1),
  ]);
  const pb = (p.data ?? [])[0] as { starts_at: string; customer_name: string; player_name: string | null } | undefined;
  if (pb) return `That clashes with ${pb.player_name || pb.customer_name}'s lesson at ${fmtTime(pb.starts_at)}.`;
  const gs = (g.data ?? [])[0] as { starts_at: string; title: string } | undefined;
  if (gs) return `That clashes with the group session "${gs.title}" at ${fmtTime(gs.starts_at)}.`;
  const bp = (t.data ?? [])[0] as { reason: string | null } | undefined;
  if (bp) return `That falls in time you've blocked off${bp.reason ? ` (${bp.reason})` : ""}. Remove the time off first if you want to use it.`;
  return null;
}

/**
 * Admin moves a confirmed private lesson to a new start time (same length). Working hours and
 * notice rules don't apply - the coach can pick any free time. Moves the calendar event and emails the client.
 */
export async function rescheduleBooking(b: Booking, newStart: Date, note: string): Promise<Booking> {
  if (b.kind !== "private") throw new BookingError("Group bookings move with their session - reschedule the session instead.");
  if (b.status !== "confirmed") throw new BookingError("Only confirmed bookings can be rescheduled.");
  if (isNaN(newStart.getTime()) || newStart <= new Date()) throw new BookingError("Pick a new time in the future.");
  const end = new Date(newStart.getTime() + (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()));
  if (newStart.toISOString() === new Date(b.starts_at).toISOString()) throw new BookingError("That's the time it's already booked for.");

  const clash = await courtClash(newStart, end, { bookingId: b.id });
  if (clash) throw new BookingError(clash);

  const { data, error } = await db()
    .from("bookings")
    .update({
      starts_at: newStart.toISOString(),
      ends_at: end.toISOString(),
      rescheduled_at: new Date().toISOString(),
      rescheduled_from: b.rescheduled_from ?? b.starts_at,
      reminder_sent_at: null,
    })
    .eq("id", b.id)
    .eq("status", "confirmed")
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23P01") throw new BookingError("That time has just been booked by someone else.");
    throw error;
  }
  if (!data) throw new BookingError("This booking can no longer be rescheduled.");

  const moved = data as Booking;
  await moveEvent(moved.google_event_id, moved.starts_at, moved.ends_at);
  await sendRescheduled(moved, await getSettings(), b.starts_at, b.ends_at, note);
  return moved;
}

/** Admin moves a group session (and every booking in it) to a new time, then emails each attendee. */
export async function rescheduleGroupSession(session: GroupSession, newStart: Date, newEnd: Date, note: string): Promise<number> {
  if (session.status !== "scheduled") throw new BookingError("This session has been cancelled.");
  if (isNaN(newStart.getTime()) || newStart <= new Date()) throw new BookingError("Pick a new time in the future.");
  if (newEnd <= newStart) throw new BookingError("The end time must be after the start time.");

  const clash = await courtClash(newStart, newEnd, { sessionId: session.id });
  if (clash) throw new BookingError(clash);

  const { error } = await db()
    .from("group_sessions")
    .update({ starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() })
    .eq("id", session.id);
  if (error) throw error;

  const { data, error: bErr } = await db()
    .from("bookings")
    .update({
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
      rescheduled_at: new Date().toISOString(),
      reminder_sent_at: null,
    })
    .eq("group_session_id", session.id)
    .in("status", ["pending", "confirmed"])
    .select("*");
  if (bErr) throw bErr;
  // Keep the first original time for bookings moved more than once.
  await db()
    .from("bookings").update({ rescheduled_from: session.starts_at })
    .eq("group_session_id", session.id)
    .in("status", ["pending", "confirmed"])
    .is("rescheduled_from", null);

  await moveEvent(session.google_event_id, newStart.toISOString(), newEnd.toISOString());
  const settings = await getSettings();
  const attendees = ((data ?? []) as Booking[]).filter((b) => b.status === "confirmed");
  for (const b of attendees) await sendRescheduled(b, settings, session.starts_at, session.ends_at, note);
  return attendees.length;
}
