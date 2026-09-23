import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { displayNameFromProfile } from "@/lib/admin-server";
import type { StaffRole } from "@/types";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  let { data: profile, error } = await supabase
    .from("profiles")
    .select("role, email, full_name, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const retry = await supabase
      .from("profiles")
      .select("role, email, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = retry.data
      ? { ...retry.data, full_name: null }
      : null;
  }

  const role = String(profile?.role ?? "").toLowerCase() as StaffRole;
  if (role !== "admin" && role !== "employee") {
    redirect(
      profile
        ? "/admin/login?error=not_staff"
        : "/admin/login?error=no_profile"
    );
  }

  return (
    <AdminShell role={role} displayName={displayNameFromProfile(profile)}>
      {children}
    </AdminShell>
  );
}
