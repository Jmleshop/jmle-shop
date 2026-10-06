import { redirect } from "next/navigation";

/** Merged into Shop-Editor (/admin/builder?tab=site). */
export default function AdminSiteSettingsRedirectPage() {
  redirect("/admin/builder?tab=site");
}
