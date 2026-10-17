"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar at the top of the page that starts the moment an internal link is clicked
 * and finishes when the new route has rendered.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [width, setWidth] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Start on internal link clicks.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      clear();
      setState("loading");
      setWidth(12);
      // Ease towards 90% while waiting.
      [[80, 35], [300, 60], [900, 78], [2000, 90]].forEach(([ms, w]) => timers.current.push(window.setTimeout(() => setWidth(w), ms)));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish when the route changes.
  useEffect(() => {
    if (state !== "loading") return;
    clear();
    setState("done");
    setWidth(100);
    timers.current.push(window.setTimeout(() => setState("idle"), 300));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => clear, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] transition-opacity duration-300 ${state === "idle" ? "opacity-0" : "opacity-100"}`}
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-brand via-brand-400 to-ball shadow-[0_0_10px_rgba(37,170,225,0.7)] transition-[width] duration-300 ease-out"
        style={{ width: state === "idle" ? 0 : `${width}%` }}
      />
    </div>
  );
}
