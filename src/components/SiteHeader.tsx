import Header from "@/components/Header";
import LayoutPreviewBridge from "@/components/LayoutPreviewBridge";
import {
  getNavCategoriesAsync,
  getPublishedLayoutAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { layoutCssVarsResponsive } from "@/lib/layout-builder";

/** Server-Wrapper: lädt Logo/Name/Layout/Kategorien für Header + Live-Chrome. */
export default async function SiteHeader() {
  const [site, layout, categories] = await Promise.all([
    getSiteConfigAsync(),
    getPublishedLayoutAsync(),
    getNavCategoriesAsync(),
  ]);
  const cssText = layoutCssVarsResponsive(layout);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssText }} />
      <LayoutPreviewBridge published={layout} />
      <Header
        logoUrl={site.logo || ""}
        siteName={site.name || "jmle"}
        layout={layout}
        categories={categories}
      />
    </>
  );
}
