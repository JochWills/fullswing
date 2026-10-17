import Link from "next/link";
import { Suspense } from "react";
import { scheduledGroupSessions, upcomingGroupSessions } from "@/lib/data";
import GroupSessionCard from "@/components/GroupSessionCard";
import PageHero from "@/components/PageHero";
import { TennisBall } from "@/components/Court";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Group sessions" };

export default async function GroupsPage() {
  // Cached list renders the page straight away; live spot counts stream into the grid.
  const scheduled = await scheduledGroupSessions();
  return (
    <>
      <PageHero eyebrow="Play together" title="Group sessions" tone="ball">
        Drills, match play and fun clinics. Limited spots per session – book and pay for one session at a time.
      </PageHero>
      <div className="container-x py-10">
        {scheduled.length ? (
          <Suspense fallback={<CardGridSkeleton count={scheduled.length} />}>
            <SessionGrid />
          </Suspense>
        ) : (
          <div className="card mx-auto max-w-2xl px-6 py-14 text-center">
            <TennisBall className="mx-auto h-14 w-14" />
            <p className="h-display mt-5 text-4xl">No sessions scheduled right now</p>
            <p className="mx-auto mt-2 max-w-md text-slate-600">
              New group sessions are added regularly. In the meantime, book a private lesson.
            </p>
            <Link href="/book" className="btn-primary mt-7">Book a private lesson</Link>
          </div>
        )}
      </div>
    </>
  );
}

async function SessionGrid() {
  const sessions = await upcomingGroupSessions();
  return (
    <div className="grid animate-fade-in gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <GroupSessionCard key={s.id} s={s} />
      ))}
    </div>
  );
}
