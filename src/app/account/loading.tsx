import { Bone, RowListSkeleton } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <div className="container-x max-w-3xl py-12">
      <Bone className="h-3 w-28" />
      <Bone className="mt-4 h-14 w-72" />
      <Bone className="mt-3 h-4 w-48" />
      <Bone className="mb-4 mt-10 h-8 w-40" />
      <RowListSkeleton />
    </div>
  );
}
