import { requireAdminView } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import { paymentsTestMode } from "@/lib/env";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminView();
  return (
    <div className="container-x py-10">
      {paymentsTestMode() && (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          ⚠️ Payments test mode is ON – bookings are confirmed without payment. Set PAYMENTS_TEST_MODE=false once Paystack is set up.
        </p>
      )}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow"><span className="h-1.5 w-6 rounded-full bg-brand" />Coach dashboard</p>
          <h1 className="h-display mt-2 text-5xl">Admin</h1>
        </div>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
