import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/env";
import { publicUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next");
  const explicitNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  const done = (email?: string | null) =>
    NextResponse.redirect(publicUrl(req, explicitNext ?? (isAdminEmail(email) ? "/admin" : "/account")));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return done(data.user?.email);
  } else if (tokenHash && (type === "magiclink" || type === "email" || type === "signup")) {
    // Token-hash links work in any browser (no PKCE verifier needed), e.g. opened on another device.
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return done(data.user?.email);
  }
  return NextResponse.redirect(publicUrl(req, "/login?error=link"));
}
