import "server-only";
import crypto from "node:crypto";

const API = "https://api.paystack.co";

function key(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k || k === "sk_test_xxx") throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    throw new Error(`Paystack ${path} failed: ${json.message || res.status}`);
  }
  return json.data as T;
}

export async function initializeTransaction(args: {
  email: string;
  amountCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorization_url: string; reference: string }> {
  return call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: args.email,
      amount: args.amountCents, // ZAR in cents
      currency: "ZAR",
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: args.metadata,
    }),
  });
}

export type VerifiedTransaction = {
  status: string; // "success" | "failed" | "abandoned" | ...
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
};

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Full refund of a transaction. Paystack processes it asynchronously (webhook: refund.processed). */
export async function refundTransaction(reference: string, note: string) {
  return call<{ status: string }>("/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: reference, merchant_note: note, customer_note: note }),
  });
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", key()).update(rawBody).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function newReference(): string {
  return "FST-" + crypto.randomBytes(8).toString("hex").toUpperCase();
}
