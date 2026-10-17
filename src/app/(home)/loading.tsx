import { Bone, CardSkeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <>
      <section className="bg-[linear-gradient(180deg,#EEF8FE_0%,#F7FBFE_55%,#F8FAFC_100%)]">
        <div className="container-wide grid items-center gap-10 pb-12 pt-10 sm:pt-14 lg:min-h-[640px] lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:pb-16 lg:pt-[72px]">
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
          <div className="skeleton mx-auto aspect-square w-full max-w-[30rem] rounded-[1.9rem] lg:ml-auto lg:mr-0" />
        </div>
      </section>
      <section className="container-wide">
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
