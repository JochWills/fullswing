import { Bone } from "@/components/ui/Skeleton";

export default function BookingLoading() {
  return (
    <div className="container-x max-w-2xl py-12">
      <Bone className="h-14 w-80 max-w-full" />
      <div className="card mt-8 overflow-hidden">
        <div className="bg-ink p-6">
          <div className="h-9 w-64 max-w-full rounded-lg bg-white/15" />
          <div className="mt-3 h-4 w-40 rounded-lg bg-white/15" />
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Bone className="h-3 w-16" />
              <Bone className="mt-2 h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
