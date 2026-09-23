import { redirect } from "next/navigation";

/** Alte Analytics-URL → Finanzmodul */
export default function AnalyticsIndexPage() {
  redirect("/admin/analytics/finance");
}
