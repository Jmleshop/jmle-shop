import Header from "@/components/Header";
import { getSiteConfigAsync } from "@/lib/catalog-server";

/** Server-Wrapper: lädt Logo/Name und reicht sie an den Client-Header. */
export default async function SiteHeader() {
  const site = await getSiteConfigAsync();
  return <Header logoUrl={site.logo || ""} siteName={site.name || "jmle"} />;
}
