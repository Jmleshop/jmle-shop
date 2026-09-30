import SiteFooter from "@/components/SiteFooter";
import { getSiteConfigAsync } from "@/lib/catalog-server";

export default async function SiteFooterShell() {
  const site = await getSiteConfigAsync();
  return <SiteFooter logoUrl={site.logo || ""} siteName={site.name || "jmle"} />;
}
