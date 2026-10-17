import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
      <div className="container-x relative max-w-md py-14 text-center sm:py-20">
        <h1 className="h-display text-6xl">Sign in</h1>
        <p className="mt-2 text-slate-600">
          New here? Just enter your email – we&apos;ll create your account and link any bookings made with that address.
        </p>
        {sp.error && (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            That sign-in link has expired or was already used. Request a new one below.
          </p>
        )}
        <div className="card mt-8 p-6 text-left sm:p-8">
          <LoginForm defaultEmail={sp.email} next={sp.next} />
        </div>
      </div>
    </div>
  );
}
