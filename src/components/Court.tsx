/** Top-down tennis court lines at real proportions (23.77m × 10.97m). Inherits colour from `currentColor`. */
export function CourtLines({ className = "", strokeWidth = 4 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 1188 548" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden>
      <rect x="0" y="0" width="1188" height="548" />
      <line x1="0" y1="68.5" x2="1188" y2="68.5" />
      <line x1="0" y1="479.5" x2="1188" y2="479.5" />
      <line x1="274" y1="68.5" x2="274" y2="479.5" />
      <line x1="914" y1="68.5" x2="914" y2="479.5" />
      <line x1="274" y1="274" x2="914" y2="274" />
      <line x1="0" y1="274" x2="14" y2="274" />
      <line x1="1174" y1="274" x2="1188" y2="274" />
      <line x1="594" y1="-20" x2="594" y2="568" strokeWidth={strokeWidth * 1.75} strokeDasharray="2 10" />
    </svg>
  );
}

/** Small tennis ball in the logo's green, with a seam. */
export function TennisBall({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="19" fill="#8CC63F" />
      <path d="M7 6.5c6 4.5 7.5 9 7.5 13.5S13 29 7 33.5M33 6.5c-6 4.5-7.5 9-7.5 13.5S27 29 33 33.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}
