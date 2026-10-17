import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isAdminEmail } from "./env";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The signed-in visitor, for display and pre-filling forms. Verifies the session JWT locally
 * (asymmetric signing keys), so it doesn't cost a round trip to Supabase Auth like getUser().
 */
export const getViewer = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const c = data?.claims;
    return c?.sub ? { id: c.sub, email: (c.email as string | undefined) ?? null } : null;
  } catch {
    return null;
  }
});

export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/?error=not-admin");
  return user;
}

/**
 * Gate for rendering admin pages. Uses the locally verified session so navigation stays fast;
 * every admin mutation still calls requireAdmin(), which checks with the Auth server.
 */
export async function requireAdminView() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (!isAdminEmail(viewer.email)) redirect("/?error=not-admin");
  return viewer;
}
