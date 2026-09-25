"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, User, ShoppingBag, Menu, X, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { formatPrice } from "@/lib/catalog";
import HeaderSearch from "@/components/HeaderSearch";

export default function Header() {
  const { total, itemCount, user } = useCart();
  const { count: wishCount } = useWishlist();
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/products", label: "جميع المنتجات" },
    { href: "/categories", label: "الفئات" },
    { href: "/wishlist", label: "المفضلة" },
    { href: "/cart", label: "السلة" },
    { href: "/search", label: "البحث" },
    {
      href: user ? "/profile" : "/auth/login",
      label: user ? "الملف الشخصي" : "تسجيل الدخول",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-jmle-cream/95 backdrop-blur-md border-b border-amber-200/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 md:h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-0.5 justify-start">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2.5 min-h-11 min-w-11 text-luxury-charcoal hover:text-gold transition-colors rounded-xl"
              aria-label="القائمة"
            >
              <Menu size={24} />
            </button>
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              className="md:hidden p-2.5 min-h-11 min-w-11 text-luxury-charcoal hover:text-gold transition-colors rounded-xl"
              aria-label="بحث"
              aria-expanded={showSearch}
            >
              <Search size={22} />
            </button>
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="التنقل الرئيسي"
            >
              {navLinks.slice(0, 4).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2.5 min-h-11 text-sm font-ui font-medium text-luxury-charcoal hover:text-gold rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link
            href="/"
            className="font-display text-2xl md:text-[1.85rem] tracking-[0.2em] text-gold-dark hover:text-gold transition-colors text-center shrink-0"
          >
            jmle
          </Link>

          <div className="flex items-center gap-0.5 justify-end">
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              className="hidden md:inline-flex lg:hidden p-2.5 min-h-11 min-w-11 text-luxury-charcoal hover:text-gold transition-colors rounded-xl"
              aria-label="بحث"
              aria-expanded={showSearch}
            >
              <Search size={22} />
            </button>
            <Link
              href="/wishlist"
              className="relative p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-luxury-charcoal hover:text-red-500 transition-colors rounded-xl"
              aria-label={`المفضلة، ${wishCount} منتج`}
            >
              <Heart size={22} aria-hidden />
              {wishCount > 0 && (
                <span className="absolute top-1 start-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white/80">
                  {wishCount > 99 ? "99+" : wishCount}
                </span>
              )}
            </Link>
            <Link
              href={user ? "/profile" : "/auth/login"}
              className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-luxury-charcoal hover:text-gold transition-colors rounded-xl"
              aria-label="الملف الشخصي"
            >
              <User size={22} />
            </Link>
            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 p-2 min-h-11 text-luxury-charcoal hover:text-gold transition-colors rounded-xl"
              aria-label={`سلة التسوق، ${itemCount} منتج`}
            >
              <ShoppingBag size={22} aria-hidden />
              {itemCount > 0 && (
                <span className="absolute top-1 start-1 bg-jmle-yellow text-luxury-black text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white/80">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
              <span className="text-xs sm:text-sm font-ui font-semibold whitespace-nowrap hidden sm:inline">
                {formatPrice(total)}
              </span>
            </Link>
          </div>
        </div>

        {/* Tablet/Desktop: permanente Suchleiste */}
        <div className="hidden md:block border-t border-amber-100/80">
          <HeaderSearch open onClose={() => setShowSearch(false)} persistent />
        </div>

        {/* Mobile: Toggle-Suche */}
        <div className="md:hidden">
          <HeaderSearch open={showSearch} onClose={() => setShowSearch(false)} />
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="القائمة"
        >
          <div
            className="absolute inset-0 bg-jmle-mahogany/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute top-0 end-0 h-full w-[min(100%,18rem)] bg-jmle-cream border-s border-amber-200/50 shadow-boutique p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-8">
              <span className="font-display text-xl tracking-[0.15em] text-gold-dark">
                jmle
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 min-h-11 min-w-11 hover:text-gold transition-colors rounded-xl"
                aria-label="إغلاق"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3.5 min-h-12 text-sm font-ui font-medium text-luxury-charcoal hover:bg-jmle-yellow/40 hover:text-gold-dark rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowSearch(true);
                }}
                className="w-full text-start block px-4 py-3.5 min-h-12 text-sm font-ui font-medium text-luxury-charcoal hover:bg-jmle-yellow/40 hover:text-gold-dark rounded-xl"
              >
                بحث سريع
              </button>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
