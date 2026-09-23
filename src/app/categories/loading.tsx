import { CategoryGridSkeleton, ProductGridSkeleton, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="py-10 px-4 space-y-10" aria-busy="true">
      <Skeleton className="h-8 w-40 mx-auto" />
      <CategoryGridSkeleton count={8} />
      <ProductGridSkeleton count={6} />
    </div>
  );
}
