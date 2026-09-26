import Link from "next/link";
import Image from "next/image";
import { getCategoriesAsync } from "@/lib/catalog-server";
import { ShopHeading, CategoryHeading } from "@/components/ShopText";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

export const dynamic = "force-dynamic";

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
              className="group relative aspect-square overflow-hidden bg-luxury-cream rounded-2xl"
            >
              <Image
                src={originalImageSrc(category.image)}
                alt={category.name}
                fill
                quality={SHOP_IMAGE_QUALITY}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-end p-6">
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
