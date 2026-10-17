import { Bone, CardSkeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-white to-slate-50">
        <div className="container-x grid items-center gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <Bone className="h-8 w-56 rounded-full" />
            <Bone className="mt-6 h-16 w-80 max-w-full sm:h-20" />
            <Bone className="mt-3 h-16 w-96 max-w-full sm:h-20" />
            <Bone className="mt-8 h-5 w-full max-w-lg" />
            <Bone className="mt-3 h-5 w-2/3 max-w-md" />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Bone className="h-14 w-full rounded-full sm:w-60" />
              <Bone className="h-14 w-full rounded-full sm:w-56" />
            </div>
          </div>
          <div className="skeleton mx-auto aspect-[5/4] w-full max-w-md rounded-[2.5rem] lg:max-w-none" />
        </div>
      </section>
      <section className="container-x">
        <Bone className="h-3 w-32" />
        <Bone className="mb-8 mt-4 h-12 w-72" />
        <div className="grid gap-6 md:grid-cols-2">
          <CardSkeleton lines={4} tall />
          <CardSkeleton lines={3} tall />
        </div>
      </section>
    </>
  );
}
