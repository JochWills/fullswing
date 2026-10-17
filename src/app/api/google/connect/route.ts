import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { authUrl } from "@/lib/google";
import { googleConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  if (!googleConfigured()) redirect("/admin/settings?google=not-configured");
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("g_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  redirect(authUrl(state));
}
