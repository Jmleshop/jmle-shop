import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types";
import type { User } from "@supabase/supabase-js";

interface StaffResult {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
  role: StaffRole;
}

interface AuthError {
  error: string;
  status: number;
}

export async function requireStaff(): Promise<StaffResult | AuthError> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht angemeldet", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? "").toLowerCase() as StaffRole;
  if (role !== "admin" && role !== "employee") {
    return { error: "Keine Mitarbeiter-Berechtigung", status: 403 };
  }

  return { user, supabase, role };
}

export async function requireAdmin(): Promise<StaffResult | AuthError> {
  const result = await requireStaff();
  if (isAuthError(result)) return result;
  if (result.role !== "admin") {
    return { error: "Keine Admin-Berechtigung", status: 403 };
  }
  return result;
}

export function isAdminError(
  result: StaffResult | AuthError
): result is AuthError {
  return "error" in result;
}

export const isAuthError = isAdminError;

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return profile?.role === "admin";
}

export function displayNameFromProfile(profile: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null) {
  const full = profile?.full_name?.trim();
  if (full) return full;
  const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return profile?.email ?? "";
}
