import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryByIdAsync,
  getProductByIdAsync,
} from "@/lib/catalog-server";
import { ProductPrice, StockBadge } from "@/components/ProductPrice";
import AddToCartButton from "@/components/AddToCartButton";
import ProductGallery from "@/components/ProductGallery";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductByIdAsync(id);

  if (!product) {
    notFound();
  }

  const category = product.categoryId
    ? await getCategoryByIdAsync(product.categoryId)
    : undefined;
  const out = product.stock <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <StockBadge stock={product.stock} />
          </div>
          <ProductGallery
            images={product.images}
            alt={product.name}
            dimmed={out}
          />
        </div>

        <div className={`flex flex-col justify-center ${out ? "opacity-60" : ""}`}>
          {category && (
            <Link
              href={`/categories/${category.id}`}
              className="text-sm text-gold hover:underline mb-2"
            >
              {category.name}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">
            {product.name}
            {product.weightValue != null && (
              <span className="text-base font-normal text-gray-500 mr-2">
                {" "}
                {product.weightValue} {product.weightUnit}
              </span>
            )}
          </h1>
          {product.nameDe && product.nameDe !== product.name && (
            <p className="text-sm text-gray-500 mb-4">{product.nameDe}</p>
          )}
          <div className="mb-6">
            <ProductPrice product={product} align="start" />
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            {product.description}
          </p>
          {product.originCountry && (
            <p className="text-sm text-gray-500 mb-2">
              Herkunft: {product.originCountry}
            </p>
          )}
          {product.ingredients && (
            <p className="text-sm text-gray-500 mb-2">
              Zutaten: {product.ingredients}
            </p>
          )}
          {product.allergens && (
            <p className="text-sm text-gray-500 mb-6">
              Allergene: {product.allergens}
            </p>
          )}
          <AddToCartButton
            productId={product.id}
            stock={product.stock}
            maxOrderQuantity={product.maxOrderQuantity}
          />
          {product.barcode && (
            <p className="text-xs text-gray-400 mt-6">Barcode: {product.barcode}</p>
          )}
        </div>
      </div>
    </div>
  );
}
