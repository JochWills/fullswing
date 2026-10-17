import { Bone, RowListSkeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <Bone className="mb-4 h-8 w-56" />
        <RowListSkeleton rows={4} />
      </div>
      <div className="card h-fit space-y-4 p-5">
        <Bone className="h-7 w-48" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Bone className="h-3 w-20" />
            <Bone className="mt-2 h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
