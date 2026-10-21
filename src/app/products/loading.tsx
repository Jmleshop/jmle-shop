import { ProductGridSkeleton, Skeleton } from "@/components/ui";

export default function ProductsLoading() {
  return (
    <div aria-busy="true" aria-label="جاري التحميل">
      <Skeleton className="h-28 w-full rounded-none" />
      <section className="px-4 py-10 md:px-8">
        <ProductGridSkeleton count={8} />
      </section>
    </div>
  );
}
