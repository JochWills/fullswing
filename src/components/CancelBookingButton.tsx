"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ui/ConfirmDialog";

export default function CancelBookingButton({ token, amount }: { token: string; amount: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${token}/cancel`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not cancel.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button className="btn-ghost btn-sm text-red-600 hover:border-red-600" onClick={() => setConfirming(true)}>
        Cancel booking
      </button>
      <ConfirmDialog
        open={confirming}
        onClose={() => {
          setConfirming(false);
          setError(null);
        }}
        title="Cancel this booking?"
        message={<>Your time slot will be released and you&apos;ll get a full refund of <b>{amount}</b>.</>}
        confirmLabel="Yes, cancel"
        busy={busy}
        error={error}
        onConfirm={cancel}
      />
    </>
  );
}
