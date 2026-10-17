import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next");
  const explicitNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = explicitNext ?? (isAdminEmail(data.user?.email) ? "/admin" : "/account");
      return NextResponse.redirect(new URL(next, req.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
