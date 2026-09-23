"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingBag, Heart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/cn";

export default function FooterNav() {
  const pathname = usePathname();
  const { itemCount, user } = useCart();
  const { count: wishCount } = useWishlist();

  if (pathname.startsWith("/admin")) return null;

  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية" },
    { href: "/categories", icon: Grid3X3, label: "الفئات" },
    {
      href: "/wishlist",
      icon: Heart,
      label: "المفضلة",
      badge: wishCount,
      badgeTone: "wish" as const,
    },
    {
      href: "/cart",
      icon: ShoppingBag,
      label: "السلة",
      badge: itemCount,
      badgeTone: "cart" as const,
    },
    {
      href: user ? "/profile" : "/auth/login",
      icon: User,
      label: user ? "حسابي" : "دخول",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-jmle-cream/95 backdrop-blur-md border-t border-amber-200/50 shadow-[0_-8px_30px_rgba(249,115,22,0.12)] md:hidden"
      aria-label="التنقل الرئيسي"
    >
      <div className="flex items-center justify-around h-16 px-0.5 max-w-lg mx-auto safe-pb">
        {navItems.map(({ href, icon: Icon, label, badge, badgeTone }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 min-w-[56px] min-h-12 rounded-xl transition-colors",
                isActive
                  ? "text-gold"
                  : "text-gray-400 hover:text-gold-dark"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative inline-flex">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  fill={
                    href === "/wishlist" && wishCount > 0 && isActive
                      ? "currentColor"
                      : "none"
                  }
                  aria-hidden
                />
                {badge != null && badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -start-2.5 text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-gold-sm border border-white/80",
                      badgeTone === "wish"
                        ? "bg-red-500 text-white"
                        : "bg-gold text-white"
                    )}
                    aria-label={`${badge} منتج`}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-ui font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
