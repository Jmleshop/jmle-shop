import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCategoriesAsync } from "@/lib/catalog-server";
import { ShopHeading, CategoryHeading } from "@/components/ShopText";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

export const revalidate = 300;

export const metadata: Metadata = { title: "جميع الأقسام | jmle" };

export default async function CategoriesPage() {
  const categories = await getCategoriesAsync();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-12">
      <ShopHeading
        k="allCategories"
        className="text-2xl md:text-3xl font-light mb-6 md:mb-8 tracking-wide text-center"
      />
      {categories.length === 0 ? (
        <ShopHeading k="noCategories" as="p" className="text-center text-gray-600 py-12" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="group relative aspect-square overflow-hidden bg-luxury-cream rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <Image
                src={originalImageSrc(category.image)}
                alt={category.name}
                fill
                quality={SHOP_IMAGE_QUALITY}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent group-hover:from-black/70 transition-colors flex items-end p-3 sm:p-4">
                <CategoryHeading
                  as="h2"
                  category={category}
                  className="text-white text-sm sm:text-base md:text-lg font-medium leading-snug line-clamp-2 text-start w-full"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
