import { ProductGridSkeleton, Skeleton } from "@/components/ui";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12" aria-busy="true" aria-label="جاري التحميل">
      <Skeleton className="mb-3 h-9 w-48" />
      <Skeleton className="mb-8 h-4 w-24" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
