"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "./ui/Spinner";

export default function LoginForm({ defaultEmail, next }: { defaultEmail?: string; next?: string }) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    // No explicit destination: the callback picks /admin for admins, /account for everyone else.
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${dest ? `?next=${encodeURIComponent(dest)}` : ""}`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
        </span>
        <p className="h-display mt-4 text-3xl">Check your inbox</p>
        <p className="mt-1 text-sm text-slate-600">
          We sent a sign-in link to <b>{email}</b>. Open it on this device to continue.
        </p>
        <button className="mt-4 text-sm font-semibold text-brand-600 underline" onClick={() => setState("idle")}>Use a different email</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email address</label>
        <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? <><Spinner /> Sending link…</> : "Email me a sign-in link"}
      </button>
      <p className="text-xs text-slate-500">No password needed. You don&apos;t need an account to book – this is only for managing your bookings.</p>
    </form>
  );
}
