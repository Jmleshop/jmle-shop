"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

/**
 * Untere mobile Leiste: Hauptmenü (Home, Kategorien, Merkliste, Warenkorb).
 */
export default function FooterNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { count: wishCount } = useWishlist();
  const { t } = useShopLocale();

  if (pathname.startsWith("/admin")) return null;

  const navItems = [
    { href: "/", icon: Home, label: t("home") },
    { href: "/categories", icon: Grid3X3, label: t("categories") },
    {
      href: "/wishlist",
      icon: Heart,
      label: t("wishlist"),
      badge: wishCount,
      badgeLabel: (n: number) => t("wishlistCount", { count: n }),
    },
    {
      href: "/cart",
      icon: ShoppingBag,
      label: t("cart"),
      badge: itemCount,
      badgeLabel: (n: number) => t("cartCount", { count: n }),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-jmle-cream/95 backdrop-blur-md border-t border-amber-200/50 shadow-[0_-8px_30px_rgba(249,115,22,0.12)] md:hidden"
      aria-label={t("mainNav")}
    >
      <div className="flex items-center justify-around h-[calc(4rem+env(safe-area-inset-bottom,0px))] px-0.5 max-w-lg mx-auto safe-pb">
        {navItems.map(({ href, icon: Icon, label, badge, badgeLabel }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5 min-w-[56px] min-h-12 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50",
                isActive
                  ? "text-gold"
                  : "text-gray-400 hover:text-gold-dark"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={badge && badgeLabel ? badgeLabel(badge) : undefined}
            >
              <span className="relative inline-flex">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  aria-hidden
                />
                {badge != null && badge > 0 && (
                  <span
                    className="absolute -top-1.5 -start-2.5 text-xs font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-gold-sm border border-white/80 bg-gold text-white"
                    aria-hidden
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="text-xs font-ui font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
