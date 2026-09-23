import Link from "next/link";
import Image from "next/image";
import { getCategoriesAsync } from "@/lib/catalog-server";

export default async function CategoriesPage() {
  const categories = await getCategoriesAsync();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-light mb-8 tracking-wide text-center">
        جميع الفئات
      </h1>
      {categories.length === 0 ? (
        <p className="text-center text-gray-400 py-12">لا توجد فئات</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="group relative aspect-square overflow-hidden bg-luxury-cream rounded-2xl"
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-end p-6">
                <h2 className="text-white text-xl font-light">{category.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
