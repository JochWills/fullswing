import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const path = request.nextUrl.pathname;
  const protectedPath = path.startsWith("/admin") || path.startsWith("/account");
  const toLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  };

  // Fast path: no Supabase auth cookie means nobody is signed in, so skip the session work entirely.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return protectedPath ? toLogin() : response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes an expired session and verifies the JWT locally (asymmetric keys) - no Auth server round trip.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && protectedPath) return toLogin();

  return response;
}
