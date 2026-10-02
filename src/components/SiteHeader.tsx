import Header from "@/components/Header";
import LayoutPreviewBridge from "@/components/LayoutPreviewBridge";
import {
  getNavCategoriesAsync,
  getPublishedLayoutAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { layoutCssVars } from "@/lib/layout-builder";

/** Server-Wrapper: lädt Logo/Name/Layout/Kategorien für Header + Live-Chrome. */
export default async function SiteHeader() {
  const [site, layout, categories] = await Promise.all([
    getSiteConfigAsync(),
    getPublishedLayoutAsync(),
    getNavCategoriesAsync(),
  ]);
  const vars = layoutCssVars(layout, "desktop");
  const cssText = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{${cssText}}html{--layout-cart:${layout.chrome.cartPosition}}`,
        }}
      />
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
