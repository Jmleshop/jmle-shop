import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const STAFF_ROLES = new Set(["admin", "employee"]);

const ADMIN_ONLY_PREFIXES = [
  "/admin/activity",
  "/admin/analytics",
  "/admin/orders",
  "/admin/discounts",
  "/admin/users",
  "/api/admin/activity",
  "/api/admin/analytics",
  "/api/admin/orders",
  "/api/admin/discounts",
  "/api/admin/users",
  "/api/admin/stats",
] as const;

function cleanPathname(pathname: string): string {
  return pathname.replace(/\.+$/, "") || "/";
}

function isAdminUiPath(path: string): boolean {
  return path.startsWith("/admin");
}

function isAdminApiPath(path: string): boolean {
  return path.startsWith("/api/admin");
}

function isPublicAdminLogin(path: string): boolean {
  return path === "/admin/login";
}

function isAdminOnlyPath(path: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function unauthorizedApi(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function redirectToLogin(request: NextRequest, path: string, error?: string) {
  // Staff-Einstieg bleibt /admin/login (ungated). Gate-Fails ohne Session
  // und ohne Staff-Rolle landen auf /auth/login laut Phase-1-Vorgabe.
  const loginUrl = new URL("/auth/login", request.url);
  if (path.startsWith("/admin") && path !== "/admin/login") {
    loginUrl.searchParams.set(
      "redirect",
      path === "/admin" ? "/admin/dashboard" : path
    );
  }
  if (error) {
    loginUrl.searchParams.set("error", error);
  }
  return NextResponse.redirect(loginUrl);
}

/**
 * Session-Refresh + Edge-Gating für Admin-UI und Admin-API.
 * Läuft vor Server Components / Route Handlers.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Pflicht: Token-Auffrischung bei jedem Request (getUser, nicht getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawPath = request.nextUrl.pathname;
  const path = cleanPathname(rawPath);

  if (path !== rawPath && isAdminUiPath(path)) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.pathname = path || "/admin";
    return NextResponse.redirect(cleanUrl);
  }

  const needsAdminGate =
    (isAdminUiPath(path) && !isPublicAdminLogin(path)) || isAdminApiPath(path);

  if (!needsAdminGate) {
    return supabaseResponse;
  }

  const wantsJson = isAdminApiPath(path);

  if (!user) {
    if (wantsJson) {
      return unauthorizedApi("Nicht angemeldet", 401);
    }
    return redirectToLogin(request, path);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    if (wantsJson) {
      return unauthorizedApi("Profil nicht gefunden", 403);
    }
    return redirectToLogin(
      request,
      path,
      profileError ? "unauthorized" : "no_profile"
    );
  }

  const role = String(profile.role ?? "").toLowerCase();
  if (!STAFF_ROLES.has(role)) {
    if (wantsJson) {
      return unauthorizedApi("Keine Mitarbeiter-Berechtigung", 403);
    }
    return redirectToLogin(request, path, "not_staff");
  }

  if (isAdminOnlyPath(path) && role !== "admin") {
    if (wantsJson) {
      return unauthorizedApi("Keine Admin-Berechtigung", 403);
    }
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return supabaseResponse;
}
