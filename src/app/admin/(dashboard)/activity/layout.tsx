import { redirect } from "next/navigation";
import { isAuthError, requireAdmin } from "@/lib/admin-server";

export default async function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    redirect("/admin/dashboard");
  }
  return children;
}
