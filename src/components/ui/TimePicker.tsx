"use client";

import { useMemo } from "react";
import Select from "./Select";

const pad = (n: number) => String(n).padStart(2, "0");

/** 24-hour time picker that posts "HH:mm", like <input type="time">. */
export default function TimePicker({
  name,
  defaultValue = "",
  value,
  onChange,
  required,
  step = 15,
  placeholder = "Select time",
  id,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** Minutes between options. */
  step?: number;
  placeholder?: string;
  id?: string;
}) {
  const options = useMemo(() => {
    const out = [];
    for (let m = 0; m < 24 * 60; m += step) {
      const t = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      out.push({ value: t, label: t });
    }
    return out;
  }, [step]);

  return (
    <Select
      id={id}
      name={name}
      options={options}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      scrollHint="08:00"
      icon={
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      }
    />
  );
}
