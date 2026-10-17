import { CardGridSkeleton, PageHeroSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeroSkeleton />
      <div className="container-x py-10">
        <CardGridSkeleton />
      </div>
    </>
  );
}
