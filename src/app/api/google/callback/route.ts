import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { clearTokenCache, exchangeCode } from "@/lib/google";
import { db } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const jar = await cookies();
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const expected = jar.get("g_oauth_state")?.value;
  jar.delete("g_oauth_state");

  if (!code || !state || state !== expected) redirect("/admin/settings?google=error");

  let ok = false;
  try {
    const { refreshToken, email } = await exchangeCode(code);
    if (refreshToken) {
      await db().from("google_auth").upsert({ id: 1, refresh_token: refreshToken, updated_at: new Date().toISOString() });
      await db().from("settings").update({ google_connected_email: email }).eq("id", 1);
      revalidateTag(TAGS.settings);
      clearTokenCache();
      ok = true;
    }
  } catch (e) {
    console.error(e);
  }
  redirect(`/admin/settings?google=${ok ? "connected" : "error"}`);
}
