import { getViewer } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { adminNotifications, markNotificationsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function admin() {
  const viewer = await getViewer();
  return viewer && isAdminEmail(viewer.email) ? viewer : null;
}

export async function GET() {
  const viewer = await admin();
  if (!viewer) return Response.json({ error: "Not allowed" }, { status: 403 });
  return Response.json(await adminNotifications(viewer.id), { headers: { "Cache-Control": "no-store" } });
}

/** Mark everything as read. */
export async function POST() {
  const viewer = await admin();
  if (!viewer) return Response.json({ error: "Not allowed" }, { status: 403 });
  await markNotificationsRead(viewer.id);
  return Response.json({ ok: true });
}
