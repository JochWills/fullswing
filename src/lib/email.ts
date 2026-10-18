import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { siteUrl } from "./env";
import { fmtDate, fmtTime, rand } from "./format";
import { addToGoogleCalendarLink } from "./google";
import type { Booking, Settings } from "./types";

let smtp: Transporter | null = null;

/**
 * Sends via SMTP when SMTP_HOST is set (e.g. a Gmail account with an app password – no domain needed),
 * otherwise via Resend when RESEND_API_KEY is set, otherwise just logs.
 */
async function send(to: string, subject: string, html: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, RESEND_API_KEY: key } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT || 465);
    smtp ??= nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
    try {
      // Gmail only sends as the signed-in address, so default the sender to it.
      await smtp.sendMail({ from: process.env.EMAIL_FROM || `"Full-Swing Tennis Academy" <${SMTP_USER}>`, to, subject, html });
    } catch (e) {
      console.error("Email send error (SMTP)", e);
    }
    return;
  }

  const from = process.env.EMAIL_FROM || "Full-Swing Tennis Academy <onboarding@resend.dev>";
  if (!key) {
    console.log(`[email skipped - no SMTP or RESEND_API_KEY] to=${to} subject="${subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) console.error("Email send failed", res.status, await res.text());
  } catch (e) {
    console.error("Email send error", e);
  }
}

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#0b0d0f">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b0d0f;padding:20px 24px;border-bottom:4px solid #22A8E0">
<img src="${siteUrl()}/logo-full-white.png" alt="Full-Swing Tennis Academy" height="44" style="display:block;height:44px;width:auto">
</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafb;color:#6b7280;font-size:12px">Full-Swing Tennis Academy · St Francis Bay</td></tr>
</table></td></tr></table></body></html>`;
}

function detailsTable(b: Booking, s: Settings) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#6b7280;width:120px;vertical-align:top">${k}</td><td style="padding:6px 0;font-weight:bold">${v}</td></tr>`;
  return `<table cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;margin:8px 0 20px">
${row("Lesson", esc(b.title))}
${row("Date", fmtDate(b.starts_at))}
${row("Time", `${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}`)}
${row("Venue", `${esc(s.venue_name)}<br><span style="font-weight:normal;color:#6b7280">${esc(s.venue_address)}</span>`)}
${b.player_name ? row("Player", esc(b.player_name)) : ""}
${b.kind === "group" && b.spots > 1 ? row("Spots", String(b.spots)) : ""}
${row("Paid", rand(b.amount_cents))}
</table>`;
}

function button(href: string, label: string, color = "#22A8E0") {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;margin:0 8px 8px 0">${label}</a>`;
}

const manageLink = (b: Booking) => `${siteUrl()}/booking/${b.manage_token}`;

export async function sendBookingConfirmation(b: Booking, s: Settings) {
  const gcal = addToGoogleCalendarLink(
    `Tennis: ${b.title}`,
    b.starts_at,
    b.ends_at,
    `${s.venue_name}, ${s.venue_address}`,
    `Manage your booking: ${manageLink(b)}`,
  );
  const body = `<p>Hi ${esc(b.customer_name.split(" ")[0])}, you're booked in. See you on court!</p>
${detailsTable(b, s)}
${button(manageLink(b), "View or cancel booking")}
${button(gcal, "Add to Google Calendar", "#0b0d0f")}
<p style="font-size:13px;color:#6b7280;margin-top:20px">You can cancel for a full refund up to ${s.cancellation_hours} hours before the lesson.
${b.user_id ? "" : `Want to see all your bookings in one place? <a href="${siteUrl()}/login?email=${encodeURIComponent(b.customer_email)}">Create a free account</a> with this email address and this booking will be saved to it.`}</p>`;
  await send(b.customer_email, `Booking confirmed: ${b.title} – ${fmtDate(b.starts_at, "EEE d MMM")} ${fmtTime(b.starts_at)}`, layout("Booking confirmed ✅", body));
}

export async function sendAdminNewBooking(b: Booking, s: Settings) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const body = `${detailsTable(b, s)}
<p><b>Client:</b> ${esc(b.customer_name)}<br><b>Email:</b> ${esc(b.customer_email)}<br><b>Phone:</b> ${esc(b.customer_phone) || "-"}</p>
${b.notes ? `<p><b>Notes:</b> ${esc(b.notes)}</p>` : ""}
${button(`${siteUrl()}/admin/bookings`, "Open admin")}`;
  await send(to, `New booking: ${b.customer_name} – ${fmtDate(b.starts_at, "EEE d MMM")} ${fmtTime(b.starts_at)}`, layout("New booking", body));
}

export async function sendCancellation(b: Booking, s: Settings, refundText: string) {
  const body = `<p>Hi ${esc(b.customer_name.split(" ")[0])}, your booking has been cancelled.</p>
${detailsTable(b, s)}
<p>${esc(refundText)}</p>
${button(`${siteUrl()}/book`, "Book another lesson")}`;
  await send(b.customer_email, `Booking cancelled: ${b.title} – ${fmtDate(b.starts_at, "EEE d MMM")}`, layout("Booking cancelled", body));

  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (to && b.cancelled_by !== "admin") {
    await send(
      to,
      `Cancelled: ${b.customer_name} – ${fmtDate(b.starts_at, "EEE d MMM")} ${fmtTime(b.starts_at)}`,
      layout("Booking cancelled", `${detailsTable(b, s)}<p><b>Client:</b> ${esc(b.customer_name)} (${esc(b.customer_email)})</p><p>${esc(refundText)}</p>`),
    );
  }
}

export async function sendRescheduled(b: Booking, s: Settings, oldStart: string, oldEnd: string, note: string) {
  const gcal = addToGoogleCalendarLink(
    `Tennis: ${b.title}`,
    b.starts_at,
    b.ends_at,
    `${s.venue_name}, ${s.venue_address}`,
    `Manage your booking: ${manageLink(b)}`,
  );
  const body = `<p>Hi ${esc(b.customer_name.split(" ")[0])}, your ${b.kind === "group" ? "session" : "lesson"} has been moved to a new time.</p>
${note ? `<p style="background:#f0f9ff;border-left:4px solid #22A8E0;padding:12px 14px;margin:0 0 16px">${esc(note)}</p>` : ""}
<p style="color:#6b7280;margin:0">Was: <s>${fmtDate(oldStart, "EEE d MMM")} · ${fmtTime(oldStart)} – ${fmtTime(oldEnd)}</s></p>
${detailsTable(b, s)}
${button(manageLink(b), "View booking")}
${button(gcal, "Add to Google Calendar", "#0b0d0f")}
<p style="font-size:13px;color:#6b7280;margin-top:20px">If the new time doesn't suit you, you can cancel for a full refund any time before it starts using the link above.</p>`;
  await send(b.customer_email, `Moved: ${b.title} – now ${fmtDate(b.starts_at, "EEE d MMM")} ${fmtTime(b.starts_at)}`, layout("Your booking has moved 📅", body));
}

export async function sendReminder(b: Booking, s: Settings) {
  const body = `<p>Hi ${esc(b.customer_name.split(" ")[0])}, a quick reminder about your tennis tomorrow.</p>
${detailsTable(b, s)}
<p>Bring water, a hat and suncream. Rackets are available if you need one – just let us know.</p>
${button(manageLink(b), "View booking")}`;
  await send(b.customer_email, `Reminder: ${b.title} tomorrow at ${fmtTime(b.starts_at)}`, layout("See you tomorrow 🎾", body));
}

export async function sendRefundIssue(b: Booking, s: Settings) {
  const body = `<p>Hi ${esc(b.customer_name.split(" ")[0])}, your payment went through, but the time you chose was taken while you were paying.</p>
${detailsTable(b, s)}
<p>We've issued a full refund to your card. It usually reflects within 5–10 working days. Sorry about that – please pick another time.</p>
${button(`${siteUrl()}/book`, "Choose another time")}`;
  await send(b.customer_email, "Your booking couldn't be completed – refund issued", layout("Booking not completed", body));
}
