import { redirect } from "next/navigation";

/** Merged into Shop-Editor (/admin/builder?tab=banner). */
export default function AdminSlidersRedirectPage() {
  redirect("/admin/builder?tab=banner");
}
