import type { NextRequest } from "next/server";

/**
 * Absolute URL on the host the browser actually used. Behind Render's proxy `req.url` is the
 * internal address (https://localhost:10000), so redirects must use the forwarded host instead.
 */
export function publicUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? req.nextUrl.protocol.replace(":", "");
  return new URL(path, `${proto}://${host}`);
}
