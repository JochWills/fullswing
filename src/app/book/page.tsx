import { activeLessonTypes, getSettings } from "@/lib/data";
import { getViewer } from "@/lib/auth";
import PrivateBookingFlow from "@/components/PrivateBookingFlow";
import PageHero from "@/components/PageHero";

export const metadata = { title: "Book a private lesson" };

export default async function BookPage() {
  const [settings, lessons, user] = await Promise.all([getSettings(), activeLessonTypes(), getViewer()]);

  return (
    <>
      <PageHero eyebrow="Private coaching" title="Book a lesson">
        One-on-one time with the coach. Choose a lesson, pick an open slot and you&apos;re booked.
      </PageHero>
      <div className="container-x py-10">
        <PrivateBookingFlow
          lessons={lessons.map(({ id, name, description, duration_minutes, price_cents }) => ({ id, name, description, duration_minutes, price_cents }))}
          horizonDays={settings.booking_horizon_days}
          cancellationHours={settings.cancellation_hours}
          venue={settings.venue_name}
          defaultEmail={user?.email ?? undefined}
        />
      </div>
    </>
  );
}
