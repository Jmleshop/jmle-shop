import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";

interface CategoryTileProps {
  category: Category;
}

export function CategoryTile({ category }: CategoryTileProps) {
  return (
    <Link
      href={`/categories/${category.id}`}
      className="group flex flex-col items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-xl"
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-gradient-to-br from-jmle-yellow to-gold-light translate-x-2 translate-y-1.5 transition-transform duration-300 ease-boutique group-hover:translate-x-2.5 group-hover:translate-y-2"
        />
        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white shadow-gold-sm transition-transform duration-300 ease-boutique group-hover:scale-105 group-hover:-translate-y-1">
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover"
            sizes="128px"
          />
        </div>
      </div>
      <span className="font-ui text-xs sm:text-sm font-medium text-luxury-charcoal group-hover:text-gold transition-colors text-center leading-snug">
        {category.name}
      </span>
    </Link>
  );
}

interface CategoryGridProps {
  categories: Category[];
  title?: string;
}

export default function CategoryGrid({ categories, title }: CategoryGridProps) {
  return (
    <section className="py-12 md:py-16 px-4 md:px-8">
      <div className="text-center mb-10">
        <h2 className="section-title">{title ?? "تسوق على حسب الفئة"}</h2>
        <div className="gold-divider" aria-hidden />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-6 max-w-5xl mx-auto">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
