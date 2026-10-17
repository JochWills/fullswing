import { CourtLines } from "./Court";

/** Light page header band used across the public pages. */
export default function PageHero({
  eyebrow,
  title,
  children,
  tone = "brand",
  narrow,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  tone?: "brand" | "ball";
  narrow?: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-brand-50 to-slate-50">
      <CourtLines className="pointer-events-none absolute -right-40 -top-24 w-[720px] rotate-[-8deg] text-brand-200/70" strokeWidth={3} />
      <div className={`container-x relative pb-10 pt-12 sm:pb-12 sm:pt-16 ${narrow ? "max-w-3xl" : ""}`}>
        {eyebrow && (
          <p className={`eyebrow ${tone === "ball" ? "text-ball-700" : ""}`}>
            <span className={`h-1.5 w-6 rounded-full ${tone === "ball" ? "bg-ball" : "bg-brand"}`} />
            {eyebrow}
          </p>
        )}
        <h1 className="h-display mt-3 text-5xl sm:text-6xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-lg text-slate-600">{children}</div>}
      </div>
    </section>
  );
}
