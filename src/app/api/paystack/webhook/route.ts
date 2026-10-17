import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { confirmByReference } from "@/lib/bookings";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Set this URL in Paystack: Settings -> API Keys & Webhooks -> Webhook URL
// https://YOUR-DOMAIN/api/paystack/webhook
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw) as { event: string; data: Record<string, unknown> };

  try {
    if (event.event === "charge.success") {
      await confirmByReference(String(event.data.reference));
    } else if (event.event === "refund.processed" || event.event === "refund.failed") {
      const ref = String(
        (event.data.transaction_reference as string) ??
          ((event.data.transaction as Record<string, unknown> | undefined)?.reference as string) ??
          "",
      );
      if (ref) {
        await db()
          .from("bookings")
          .update({ refund_status: event.event === "refund.processed" ? "processed" : "failed" })
          .eq("paystack_reference", ref);
      }
    }
  } catch (e) {
    console.error("Webhook handling failed", e);
    return new Response("Error", { status: 500 }); // Paystack will retry
  }

  return new Response("OK");
}
