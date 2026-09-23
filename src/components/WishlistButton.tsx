"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/cn";

export default function WishlistButton({
  productId,
  className,
  size = "md",
}: {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { has, toggle } = useWishlist();
  const active = has(productId);

  const dim =
    size === "sm"
      ? "min-h-11 min-w-11 p-2"
      : size === "lg"
        ? "min-h-12 min-w-12 p-3"
        : "min-h-11 min-w-11 p-2.5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(productId);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-amber-200/60 shadow-gold-sm transition-all duration-300 ease-boutique hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
        active ? "text-red-500 border-red-200" : "text-luxury-charcoal hover:text-red-500",
        dim,
        className
      )}
      aria-pressed={active}
      aria-label={active ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
      title={active ? "Aus Merkliste entfernen" : "Zur Merkliste"}
    >
      <Heart
        size={size === "lg" ? 22 : 18}
        fill={active ? "currentColor" : "none"}
        strokeWidth={active ? 1.5 : 2}
        aria-hidden
      />
    </button>
  );
}
