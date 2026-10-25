import { NextResponse } from "next/server";
import { absoluteAppUrl, isPreviewDeploymentHost } from "@/lib/app-url";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  let host = "localhost";
  try {
    host = new URL(origin).hostname;
  } catch {
    /* ignore */
  }
  const baseOrigin = isPreviewDeploymentHost(host)
    ? absoluteAppUrl("/").origin
    : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseOrigin}${safeNextPath(searchParams.get("next"), baseOrigin)}`);
    }
  }

  return NextResponse.redirect(`${baseOrigin}/auth/login?error=auth`);
}
