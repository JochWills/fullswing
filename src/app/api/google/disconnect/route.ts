import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { clearTokenCache } from "@/lib/google";
import { db } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST() {
  await requireAdmin();
  await db().from("google_auth").delete().eq("id", 1);
  await db().from("settings").update({ google_connected_email: null }).eq("id", 1);
  revalidateTag(TAGS.settings);
  clearTokenCache();
  redirect("/admin/settings?google=disconnected");
}
