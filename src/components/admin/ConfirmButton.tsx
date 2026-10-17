"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Spinner from "@/components/ui/Spinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/**
 * Button that asks for confirmation in a custom popup before submitting its <form>.
 * The popup stays open (with a spinner) until the server action finishes.
 */
export default function ConfirmButton({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel,
  children,
  className = "btn-ghost btn-sm",
  ariaLabel,
}: {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  // Close once the action has finished.
  useEffect(() => {
    if (wasPending.current && !pending) setOpen(false);
    wasPending.current = pending;
  }, [pending]);

  return (
    <>
      <button type="button" className={className} disabled={pending} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {pending && !open ? <Spinner /> : children}
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        busy={pending}
        submit
      />
    </>
  );
}
