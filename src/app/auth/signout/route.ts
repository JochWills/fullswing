import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/url";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(publicUrl(req, "/"), { status: 303 });
}
