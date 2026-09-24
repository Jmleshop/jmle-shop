import { NextResponse } from "next/server";
import { absoluteAppUrl, isPreviewDeploymentHost } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

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
      return NextResponse.redirect(`${baseOrigin}${next}`);
    }
  }

  return NextResponse.redirect(`${baseOrigin}/auth/login?error=auth`);
}
