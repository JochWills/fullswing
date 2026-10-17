"use client";

import { useFormStatus } from "react-dom";
import Spinner from "@/components/ui/Spinner";

export default function SubmitButton({
  children,
  className = "btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? <><Spinner /> Saving…</> : children}
    </button>
  );
}
