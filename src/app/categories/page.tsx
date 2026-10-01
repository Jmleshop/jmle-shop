import Link from "next/link";
import { getCategoriesAsync } from "@/lib/catalog-server";
import { ShopHeading, CategoryHeading } from "@/components/ShopText";
import ShopImage from "@/components/ShopImage";

export const revalidate = 60;

export default async function CategoriesPage() {
  const categories = await getCategoriesAsync();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <ShopHeading
        k="allCategories"
        className="text-3xl font-light mb-8 tracking-wide text-center"
      />
      {categories.length === 0 ? (
        <ShopHeading k="noCategories" as="p" className="text-center text-gray-400 py-12" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="group relative aspect-square overflow-hidden rounded-2xl"
            >
              <ShopImage
                role="category"
                src={category.image}
                alt={category.name}
                sizes="(max-width: 768px) 50vw, 33vw"
                frameClassName="absolute inset-0 aspect-auto rounded-2xl"
                mediaClassName="transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 z-10 bg-black/30 group-hover:bg-black/40 transition-colors flex items-end p-6">
                <CategoryHeading
                  as="h2"
                  category={category}
                  className="text-white text-xl font-light"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
