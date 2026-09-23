import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname.replace(/\.+$/, "");

  if (path !== request.nextUrl.pathname && path.startsWith("/admin")) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.pathname = path || "/admin";
    return NextResponse.redirect(cleanUrl);
  }

  if (path.startsWith("/admin") && path !== "/admin/login") {
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      if (path !== "/admin/login") {
        loginUrl.searchParams.set(
          "redirect",
          path === "/admin" ? "/admin/dashboard" : path
        );
      }
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", profileError ? "unauthorized" : "no_profile");
      return NextResponse.redirect(loginUrl);
    }

    const role = String(profile.role ?? "").toLowerCase();
    if (role !== "admin" && role !== "employee") {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "not_staff");
      return NextResponse.redirect(loginUrl);
    }

    const adminOnly =
      path.startsWith("/admin/activity") ||
      path.startsWith("/admin/analytics") ||
      path.startsWith("/admin/orders") ||
      path.startsWith("/admin/discounts") ||
      path.startsWith("/admin/users");

    if (adminOnly && role !== "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return supabaseResponse;
}
