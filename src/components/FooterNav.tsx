"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingBag, Search, LogIn } from "lucide-react";
import { useCart } from "@/context/CartContext";

const navItems = [
  { href: "/", icon: Home, label: "الرئيسية" },
  { href: "/categories", icon: Grid3X3, label: "الفئات" },
  { href: "/cart", icon: ShoppingBag, label: "السلة", showBadge: true },
  { href: "/search", icon: Search, label: "بحث" },
  { href: "/auth/login", icon: LogIn, label: "دخول" },
];

export default function FooterNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-jmle-cream/95 backdrop-blur-sm border-t border-jmle-orange/30 shadow-[0_-4px_20px_rgba(249,115,22,0.12)]">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label, showBadge }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] transition-colors ${
                isActive ? "text-gold" : "text-gray-400 hover:text-gold-dark"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              {showBadge && itemCount > 0 && (
                <span className="absolute top-0 left-1/2 translate-x-2 bg-gold text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
