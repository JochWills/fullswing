/** Building blocks for loading.tsx placeholders. They mirror the real layouts so nothing jumps when content arrives. */

export function Bone({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function PageHeroSkeleton({ withText = true }: { withText?: boolean }) {
  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="container-x pb-10 pt-12 sm:pb-12 sm:pt-16">
        <Bone className="h-3 w-32" />
        <Bone className="mt-5 h-12 w-72 max-w-full sm:h-14" />
        {withText && <Bone className="mt-5 h-5 w-[28rem] max-w-full" />}
      </div>
    </section>
  );
}

export function CardSkeleton({ lines = 2, tall }: { lines?: number; tall?: boolean }) {
  return (
    <div className={`card flex flex-col p-6 ${tall ? "min-h-[16rem]" : ""}`}>
      <Bone className="h-5 w-20 rounded-full" />
      <Bone className="mt-5 h-8 w-3/4" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={`mt-3 h-4 ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
      ))}
      <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-5">
        <Bone className="h-9 w-24" />
        <Bone className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} tall />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card p-6 sm:p-8">
        <Bone className="h-3 w-28" />
        <Bone className="mt-4 h-12 w-2/3" />
        <Bone className="mt-5 h-4 w-full" />
        <Bone className="mt-3 h-4 w-5/6" />
        <div className="my-7 border-t border-dashed border-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Bone className="h-3 w-24" />
              <Bone className="mt-2 h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <div className="card h-fit overflow-hidden">
        <div className="bg-ink p-6">
          <div className="h-3 w-20 rounded-lg bg-white/15" />
          <div className="mt-3 h-8 w-48 rounded-lg bg-white/15" />
        </div>
        <div className="space-y-4 p-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <Bone className="h-4 w-16" />
              <Bone className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RowListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          <Bone className="h-16 w-14 rounded-xl" />
          <div className="flex-1">
            <Bone className="h-4 w-1/2" />
            <Bone className="mt-2 h-3 w-1/3" />
          </div>
          <Bone className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
