"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/** Close a popover on outside click or Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

/** Open upwards when there isn't room below the trigger. */
export function usePlacement(ref: RefObject<HTMLElement | null>, open: boolean, height: number) {
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setUp(window.innerHeight - r.bottom < height + 16 && r.top > height + 16);
  }, [ref, open, height]);
  return up;
}

/** Restore the default value when the surrounding <form> is reset (React 19 resets forms after an action). */
export function useFormReset(ref: RefObject<HTMLInputElement | null>, onReset: () => void) {
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [ref, onReset]);
}

export const chevron = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400 transition group-aria-expanded:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
