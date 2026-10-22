import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEMO_EMAIL = "admin@jmle.test";
const DEMO_PASSWORD = "password123";

async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !data.user) {
    return { error: "E-Mail oder Passwort ist falsch.", status: 401 as const };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return { error: `Profil konnte nicht gelesen werden (${profileError.message}).`, status: 500 as const };
  }
  if (!profile) {
    return { error: "Login erfolgreich, aber kein Eintrag in profiles für diesen Benutzer.", status: 403 as const };
  }

  const role = String(profile.role ?? "").toLowerCase().trim();
  if (role !== "admin" && role !== "employee") {
    return { error: `Die Rolle ist „${profile.role || "(leer)"}“ statt admin oder employee.`, status: 403 as const };
  }
  return { role };
}

export async function GET(request: Request) {
  const result = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
  if ("error" in result) {
    return NextResponse.redirect(new URL(`/admin/login?error=unauthorized`, request.url));
  }
  return NextResponse.redirect(new URL("/admin/dashboard", request.url));
}

export async function POST(request: Request) {
  let email = DEMO_EMAIL;
  let password = DEMO_PASSWORD;
  try {
    const body = await request.json();
    if (body?.email) email = String(body.email).trim();
    if (body?.password) password = String(body.password);
  } catch {
    email = DEMO_EMAIL;
    password = DEMO_PASSWORD;
  }

  const result = await signIn(email, password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, role: result.role });
}
