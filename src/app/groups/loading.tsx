import { CardGridSkeleton, PageHeroSkeleton } from "@/components/ui/Skeleton";

export default function GroupsLoading() {
  return (
    <>
      <PageHeroSkeleton />
      <div className="container-x py-10">
        <CardGridSkeleton />
      </div>
    </>
  );
}
