import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-jmle-ocher/60",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-l after:from-transparent after:via-white/40 after:to-transparent",
        className
      )}
      aria-hidden
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card-boutique overflow-hidden" aria-busy="true">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-[80%] mx-auto" />
        <Skeleton className="h-3 w-1/2 mx-auto" />
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto"
      role="status"
      aria-label="جاري التحميل"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-4 md:grid-cols-8 gap-4 md:gap-6 max-w-4xl mx-auto"
      role="status"
      aria-label="جاري التحميل"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div
      className="max-w-6xl mx-auto px-4 py-8 md:py-12 animate-fade-up"
      role="status"
      aria-label="جاري تحميل المنتج"
    >
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-[75%]" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
