"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCartFly } from "@/context/CartFlyContext";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

export default function FooterNav() {
  const pathname = usePathname();
  const { itemCount, user } = useCart();
  const { registerCartIcon, cartBumping } = useCartFly();
  const { t } = useShopLocale();
  const cartRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    return registerCartIcon(cartRef.current);
  }, [registerCartIcon, itemCount]);

  if (pathname.startsWith("/admin")) return null;

  const navItems = [
    { href: "/", icon: Home, label: t("home"), key: "home" },
    { href: "/categories", icon: LayoutGrid, label: t("categories"), key: "categories" },
    { href: "/cart", icon: ShoppingBag, label: t("cart"), key: "cart", badge: itemCount },
    { href: "/search", icon: Search, label: t("search"), key: "search" },
    {
      href: user ? "/profile" : "/auth/login",
      icon: User,
      label: user ? t("account") : t("login"),
      key: "account",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-amber-200/60 bg-jmle-cream/95 shadow-[0_-10px_30px_rgba(180,83,9,0.12)] backdrop-blur-md md:hidden"
      aria-label={t("mainNav")}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {navItems.map(({ href, icon: Icon, label, key, badge }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          const isCart = key === "cart";

          return (
            <Link
              key={key}
              ref={isCart ? cartRef : undefined}
              href={href}
              className={cn(
                "relative flex min-h-12 min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-ui font-medium transition-colors",
                isActive ? "text-brand-orange" : "text-luxury-charcoal/55"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={isCart ? t("cartCount", { count: itemCount }) : label}
              data-cart-icon={isCart ? true : undefined}
            >
              <span
                className={cn(
                  "relative inline-flex rounded-2xl p-1.5",
                  isActive && "bg-brand-orange/10",
                  isCart && cartBumping && "animate-cart-bump text-brand-red"
                )}
              >
                <Icon size={22} strokeWidth={isActive ? 2.4 : 1.75} aria-hidden />
                {isCart && badge > 0 && (
                  <span className="absolute -top-1 -start-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-white/80 bg-brand-red px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="max-w-[4.5rem] truncate leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
