"use client";

import { useState } from "react";
import Spinner from "./ui/Spinner";

export type CustomerValues = {
  name: string;
  email: string;
  phone: string;
  playerName: string;
  notes: string;
  acceptPolicy: boolean;
};

export default function CustomerForm({
  defaultEmail,
  defaultName,
  cancellationHours,
  submitLabel,
  extra,
  onSubmit,
  onBack,
}: {
  defaultEmail?: string;
  defaultName?: string;
  cancellationHours: number;
  submitLabel: string;
  extra?: React.ReactNode;
  onSubmit: (v: CustomerValues) => Promise<string | void>;
  onBack?: () => void;
}) {
  const [v, setV] = useState<CustomerValues>({
    name: defaultName ?? "",
    email: defaultEmail ?? "",
    phone: "",
    playerName: "",
    notes: "",
    acceptPolicy: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof CustomerValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSubmit(v);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {extra}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Your name *</label>
          <input id="name" className="input" required minLength={2} value={v.name} onChange={set("name")} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email *</label>
          <input id="email" type="email" className="input" required value={v.email} onChange={set("email")} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Cellphone</label>
          <input id="phone" type="tel" className="input" value={v.phone} onChange={set("phone")} autoComplete="tel" placeholder="082 123 4567" />
        </div>
        <div>
          <label className="label" htmlFor="player">Player name <span className="font-normal text-slate-500">(if not you)</span></label>
          <input id="player" className="input" value={v.playerName} onChange={set("playerName")} placeholder="e.g. your child's name" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Anything the coach should know?</label>
        <textarea id="notes" className="input min-h-[80px]" value={v.notes} onChange={set("notes")} placeholder="Level, goals, injuries…" />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm">
        <input type="checkbox" className="checkbox mt-px" checked={v.acceptPolicy} onChange={set("acceptPolicy")} required />
        <span>
          I understand I can cancel online for a <b>full refund up to {cancellationHours} hours</b> before the lesson. Later
          cancellations aren&apos;t refundable.
        </span>
      </label>
      {error && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {onBack && (
          <button type="button" className="btn-ghost" onClick={onBack} disabled={busy}>
            ← Back
          </button>
        )}
        <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={busy}>
          {busy ? <><Spinner /> Taking you to payment…</> : submitLabel}
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        You&apos;ll be taken to Paystack to pay securely by card, EFT or instant payment.</p>
    </form>
  );
}

export async function postBooking(payload: Record<string, unknown>): Promise<string | void> {
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return json.error || "Something went wrong.";
    window.location.href = json.redirectUrl;
  } catch {
    return "Network error. Please check your connection and try again.";
  }
}
