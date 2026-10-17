import { Bone, DetailSkeleton } from "@/components/ui/Skeleton";

export default function GroupSessionLoading() {
  return (
    <div className="container-x py-10">
      <Bone className="h-4 w-36" />
      <div className="mt-5">
        <DetailSkeleton />
      </div>
    </div>
  );
}
