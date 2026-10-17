import { getNavCategoriesAsync } from "@/lib/catalog-server";
import CategoryHierarchy from "@/components/CategoryHierarchy";
import { ShopHeading } from "@/components/ShopText";

export const revalidate = 60;

/**
 * Live-Kategorien aus der Admin-DB (hierarchisch mit Bildern).
 * Keine Demo-/Fallback-Kategorien — nur getNavCategoriesAsync.
 */
export default async function CategoriesPage() {
  const categories = await getNavCategoriesAsync();

  return (
    <div className="max-w-6xl mx-auto py-8 md:py-12">
      <div className="px-4 mb-2">
        <ShopHeading
          k="allCategories"
          className="text-3xl font-light tracking-wide text-center"
        />
      </div>
      <CategoryHierarchy categories={categories} className="mt-6" />
    </div>
  );
}
