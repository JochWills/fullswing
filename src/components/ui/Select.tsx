"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { chevron, useDismiss, useFormReset, usePlacement } from "./popover";

export type SelectOption = { value: string; label: string };

/**
 * Custom dropdown that still works inside plain <form>s: the value is posted under `name`
 * and `required` uses the browser's own validation.
 */
export default function Select({
  name,
  options,
  defaultValue = "",
  value: controlled,
  onChange,
  placeholder = "Select…",
  required,
  id,
  icon,
  scrollHint,
  className = "",
}: {
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  icon?: React.ReactNode;
  /** Option to scroll to when opening with nothing selected (e.g. "08:00" in a time list). */
  scrollHint?: string;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);
  useFormReset(inputRef, useCallback(() => setInternal(defaultValue), [defaultValue]));
  const up = usePlacement(rootRef, open, 280);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  function choose(i: number) {
    const v = options[i]?.value;
    if (v === undefined) return;
    if (controlled === undefined) setInternal(v);
    onChange?.(v);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function openList() {
    typed.current = { text: "", at: 0 }; // type-ahead starts fresh each time the list opens
    const hint = options.findIndex((o) => o.value === scrollHint);
    setActive(selectedIndex >= 0 ? selectedIndex : Math.max(0, hint));
    setOpen(true);
  }

  // Keep the highlighted option visible; centre it when the list first opens.
  const justOpened = useRef(false);
  useEffect(() => {
    justOpened.current = open;
  }, [open]);
  useEffect(() => {
    const list = listRef.current;
    const item = itemRefs.current[active];
    if (!open || !list || !item) return;
    // Scroll only the list (scrollIntoView would also scroll the page).
    if (justOpened.current) {
      list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2;
    } else if (item.offsetTop < list.scrollTop) {
      list.scrollTop = item.offsetTop - 6;
    } else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight + 6;
    }
    justOpened.current = false;
  }, [open, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const moves: Record<string, number> = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: last, PageDown: active + 8, PageUp: active - 8 };
    if (e.key in moves) {
      e.preventDefault();
      setActive(Math.min(last, Math.max(0, moves[e.key])));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      // Type-ahead: jump to the first option starting with what was typed.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && (
        <input
          ref={inputRef}
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          onFocus={() => buttonRef.current?.focus()}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`input group flex items-center gap-2.5 text-left ${open ? "border-brand ring-4 ring-brand/15" : ""}`}
      >
        {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
        <span className={`flex-1 truncate ${selected ? "" : "text-slate-400"}`}>{selected?.label ?? placeholder}</span>
        {chevron}
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`absolute left-0 z-30 max-h-64 w-full min-w-[11rem] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.map((o, i) => {
            const isSel = i === selectedIndex;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                  i === active ? "bg-brand-50" : ""
                } ${isSel ? "font-semibold text-brand-700" : "text-ink"}`}
              >
                {o.label}
                {isSel && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
