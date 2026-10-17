"use client";

import { useEffect, useRef } from "react";
import Spinner from "./Spinner";

type Tone = "danger" | "neutral";

/**
 * Confirmation popup built on the native <dialog> (focus trap, Escape, top layer for free).
 * Use `submit` to make the confirm button submit the surrounding <form>, or `onConfirm` for a callback.
 */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Keep it",
  tone = "danger",
  busy,
  error,
  submit,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  busy?: boolean;
  error?: string | null;
  submit?: boolean;
  onConfirm?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={onClose}
      onCancel={(e) => busy && e.preventDefault()}
      // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => e.target === ref.current && !busy && onClose()}
      className="w-[min(26rem,calc(100vw-2rem))] rounded-3xl border-0 bg-transparent p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      <div className="rounded-3xl bg-white p-6 shadow-lift sm:p-7">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"}`}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {tone === "danger" ? (
              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            ) : (
              <path d="M12 8v5M12 16.5v.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
            )}
          </svg>
        </span>
        <h2 id="confirm-title" className="h-display mt-5 text-3xl">
          {title}
        </h2>
        {message && <div className="mt-2 text-sm leading-relaxed text-slate-600">{message}</div>}
        {error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy} autoFocus>
            {cancelLabel}
          </button>
          <button
            type={submit ? "submit" : "button"}
            onClick={submit ? undefined : onConfirm}
            disabled={busy}
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
          >
            {busy ? (
              <>
                <Spinner /> Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
