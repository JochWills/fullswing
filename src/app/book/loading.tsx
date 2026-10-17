import { Bone, CardGridSkeleton, PageHeroSkeleton } from "@/components/ui/Skeleton";

export default function BookLoading() {
  return (
    <>
      <PageHeroSkeleton />
      <div className="container-x py-10">
        <div className="mb-4 flex items-center gap-3">
          <Bone className="h-9 w-9 rounded-xl" />
          <Bone className="h-8 w-56" />
        </div>
        <CardGridSkeleton />
      </div>
    </>
  );
}
