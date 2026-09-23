import { ProductGridSkeleton, CategoryGridSkeleton, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="animate-fade-up" aria-busy="true" aria-label="جاري التحميل">
      <Skeleton className="w-full h-[52vh] md:h-[72vh] rounded-none" />
      <section className="py-12 px-4">
        <Skeleton className="h-8 w-48 mx-auto mb-8" />
        <CategoryGridSkeleton />
      </section>
      <section className="py-10 px-4">
        <Skeleton className="h-8 w-56 mx-auto mb-8" />
        <ProductGridSkeleton />
      </section>
    </div>
  );
}
