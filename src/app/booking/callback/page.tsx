import { redirect } from "next/navigation";
import Link from "next/link";
import { confirmByReference } from "@/lib/bookings";

export const metadata = { title: "Confirming payment" };

export default async function CallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const reference = sp.reference || sp.trxref;
  if (!reference) redirect("/");

  let booking = null;
  try {
    booking = await confirmByReference(reference);
  } catch (e) {
    console.error(e);
  }

  if (booking && (booking.status === "confirmed" || booking.status === "cancelled")) {
    redirect(`/booking/${booking.manage_token}?new=1`);
  }

  return (
    <div className="container-x max-w-xl py-20 text-center">
      <span className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-ball/20">
        <span className="h-6 w-6 rounded-full bg-ball" />
      </span>
      <h1 className="h-display mt-6 text-5xl">We haven&apos;t received your payment yet</h1>
      <p className="mt-3 text-slate-600">
        If you completed the payment, it can take a moment to come through. Refresh this page in a few seconds. If you
        cancelled, your time slot will be released after 20 minutes.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href={`/booking/callback?reference=${encodeURIComponent(reference)}`} className="btn-primary">Check again</Link>
        <Link href="/book" className="btn-ghost">Start over</Link>
      </div>
    </div>
  );
}
