"use client";

import { useState } from "react";
import CustomerForm, { postBooking } from "./CustomerForm";

const rand = (c: number) => "R" + (c / 100).toLocaleString("en-ZA", { maximumFractionDigits: 2 }).replace(/ /g, " ");

export default function GroupBookingForm({
  sessionId, priceCents, maxSpots, cancellationHours, defaultEmail,
}: {
  sessionId: string; priceCents: number; maxSpots: number; cancellationHours: number; defaultEmail?: string;
}) {
  const [spots, setSpots] = useState(1);
  return (
    <CustomerForm
      defaultEmail={defaultEmail}
      cancellationHours={cancellationHours}
      submitLabel={`Pay ${rand(priceCents * spots)} & book`}
      extra={
        maxSpots > 1 ? (
          <div role="radiogroup" aria-labelledby="spots-label">
            <p className="label" id="spots-label">Number of players</p>
            <div className="inline-flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
              {Array.from({ length: maxSpots }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={spots === n}
                  onClick={() => setSpots(n)}
                  className={`h-10 min-w-10 rounded-full px-4 text-sm font-bold transition ${
                    spots === n ? "bg-brand text-white shadow-glow" : "text-slate-600 hover:bg-white hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : null
      }
      onSubmit={(v) => postBooking({ type: "group", sessionId, spots, ...v })}
    />
  );
}
