"use client";

import { useRef } from "react";

/** Number input with −/+ buttons. Uses a real <input type="number"> so form posting and validation are unchanged. */
export default function NumberField({
  name,
  defaultValue,
  min,
  max,
  step,
  buttonStep = 1,
  prefix,
  suffix,
  required,
  placeholder,
  id,
}: {
  name: string;
  defaultValue?: number | string;
  min?: number;
  max?: number;
  /** Precision allowed when typing (e.g. 0.01 for money). */
  step?: number | string;
  /** Amount the −/+ buttons change the value by. */
  buttonStep?: number;
  prefix?: string;
  suffix?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function bump(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    let n = (el.value === "" ? (min ?? 0) : Number(el.value)) + dir * buttonStep;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    el.value = String(Math.round(n * 100) / 100);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className="input flex items-stretch gap-1 p-1 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
      <StepButton label="Decrease" onClick={() => bump(-1)}>
        <path d="M5 12h14" />
      </StepButton>
      <div className={`flex min-w-0 flex-1 items-center gap-1 ${prefix ? "pl-1" : "justify-center"}`}>
        {prefix && <span className="text-slate-400">{prefix}</span>}
        <input
          ref={ref}
          id={id}
          type="number"
          name={name}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          required={required}
          placeholder={placeholder}
          inputMode={String(step ?? "").includes(".") ? "decimal" : "numeric"}
          className={`w-full min-w-0 bg-transparent py-1.5 font-semibold ${prefix ? "text-left" : "text-center"} tabular-nums text-ink [appearance:textfield] placeholder:font-normal placeholder:text-slate-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        {suffix && <span className="shrink-0 text-sm text-slate-400">{suffix}</span>}
      </div>
      <StepButton label="Increase" onClick={() => bump(1)}>
        <path d="M12 5v14M5 12h14" />
      </StepButton>
    </div>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      onClick={onClick}
      className="flex w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
