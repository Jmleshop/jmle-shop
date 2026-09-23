"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/catalog";

export default function Header() {
  const { total, itemCount, user } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/categories", label: "الفئات" },
    { href: "/cart", label: "السلة" },
    { href: "/search", label: "البحث" },
    { href: user ? "/profile" : "/auth/login", label: user ? "الملف الشخصي" : "تسجيل الدخول" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-jmle-cream/95 backdrop-blur-sm border-b border-jmle-orange/30">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-[72px] grid grid-cols-3 items-center">
          {/* Rechts (RTL col 1): Hamburger + Suche */}
          <div className="flex items-center gap-1 justify-start">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2.5 text-luxury-charcoal hover:text-gold transition-colors"
              aria-label="القائمة"
            >
              <Menu size={24} />
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 text-luxury-charcoal hover:text-gold transition-colors"
              aria-label="بحث"
            >
              <Search size={22} />
            </button>
          </div>

          {/* Mitte: Logo */}
          <Link
            href="/"
            className="text-2xl md:text-[1.75rem] font-semibold tracking-[0.25em] text-gold-dark hover:text-gold transition-colors text-center"
          >
            jmle
          </Link>

          {/* Links (RTL col 3): Profil + Warenkorb */}
          <div className="flex items-center gap-1 justify-end">
            <Link
              href={user ? "/profile" : "/auth/login"}
              className="p-2.5 text-luxury-charcoal hover:text-gold transition-colors"
              aria-label="الملف الشخصي"
            >
              <User size={22} />
            </Link>
            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 p-2 text-luxury-charcoal hover:text-gold transition-colors"
              aria-label="سلة التسوق"
            >
              <ShoppingBag size={22} />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-jmle-yellow text-luxury-black text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
              <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                {formatPrice(total)}
              </span>
            </Link>
          </div>
        </div>

        {showSearch && (
          <div className="px-4 pb-3">
            <form onSubmit={handleSearch} className="relative max-w-lg mx-auto">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                autoFocus
                className="w-full px-4 py-2.5 pr-10 text-sm bg-white border border-jmle-orange/40 rounded-full focus:outline-none focus:border-gold"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gold"
              >
                <Search size={18} />
              </button>
            </form>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute top-0 right-0 h-full w-72 bg-jmle-cream shadow-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl tracking-[0.2em] font-semibold">jmle</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:text-gold transition-colors"
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
                  className="block px-4 py-3 text-sm font-medium text-luxury-charcoal hover:bg-jmle-yellow/40 hover:text-gold-dark rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
