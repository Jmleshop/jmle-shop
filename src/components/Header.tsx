"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, User, ShoppingBag, Menu, X, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCartFly } from "@/context/CartFlyContext";
import { useShopLocale } from "@/components/ShopLocale";
import { formatPrice } from "@/lib/catalog";
import HeaderSearch from "@/components/HeaderSearch";
import BrandMark from "@/components/BrandMark";
import { cn } from "@/lib/cn";

export default function Header({
  logoUrl = "",
  siteName = "jmle",
}: {
  logoUrl?: string;
  siteName?: string;
}) {
  const { total, itemCount, user } = useCart();
  const { count: wishCount } = useWishlist();
  const { lang, setLang, t } = useShopLocale();
  const { registerCartIcon, cartBumping } = useCartFly();
  const cartRef = useRef<HTMLAnchorElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    registerCartIcon(cartRef.current);
  }, [registerCartIcon, itemCount]);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > 12);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("products") },
    { href: "/categories", label: t("categories") },
    { href: "/wishlist", label: t("wishlist") },
    { href: "/cart", label: t("cart") },
    { href: "/search", label: t("search") },
    {
      href: user ? "/profile" : "/auth/login",
      label: user ? t("account") : t("login"),
    },
  ];

  const cartLink = (
    <Link
      ref={cartRef}
      href="/cart"
      className={cn(
        "relative flex items-center gap-1.5 p-2 min-h-11 text-luxury-charcoal hover:text-brand-orange transition-colors rounded-xl",
        cartBumping && "animate-cart-bump text-brand-red"
      )}
      aria-label={t("cartCount", { count: itemCount })}
      data-cart-icon
    >
      <ShoppingBag size={22} aria-hidden />
      {itemCount > 0 && (
        <span
          className={cn(
            "absolute top-1 start-1 bg-brand-red text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white/80",
            cartBumping && "animate-cart-glow"
          )}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
      <span className="text-xs sm:text-sm font-ui font-semibold whitespace-nowrap hidden sm:inline">
        {formatPrice(total, lang === "de" ? "de-DE" : "ar-DE")}
      </span>
    </Link>
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 isolate bg-jmle-cream/95 backdrop-blur-md border-b border-orange-200/50",
          "supports-[backdrop-filter]:bg-jmle-cream/90",
          "transition-[box-shadow,background-color] duration-200 ease-out will-change-transform",
          "[transform:translateZ(0)]",
          scrolled && "shadow-gold-sm bg-jmle-cream/98"
        )}
      >
        {/* Mobile: Profil | Logo | Warenkorb + Menü — Logo ~52px */}
        <div className="lg:hidden max-w-7xl mx-auto px-3 h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex justify-start">
            <Link
              href={user ? "/profile" : "/auth/login"}
              className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-luxury-charcoal hover:text-brand-orange transition-colors rounded-xl"
              aria-label={user ? t("account") : t("login")}
            >
              <User size={22} />
            </Link>
          </div>
          <BrandMark
            logoUrl={logoUrl}
            name={siteName}
            priority
            textClassName="text-brand-orange hover:text-brand-red"
          />
          <div className="flex items-center justify-end gap-0.5">
            {cartLink}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2.5 min-h-11 min-w-11 text-luxury-charcoal hover:text-brand-orange transition-colors rounded-xl"
              aria-label={t("menu")}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Desktop — Logo ~72px, klar lesbar */}
        <div className="hidden lg:grid max-w-7xl mx-auto px-4 h-[96px] grid-cols-[1fr_auto_1fr] items-center gap-2">
          <nav
            className="flex items-center gap-1 justify-start"
            aria-label={t("mainNav")}
          >
            {navLinks.slice(0, 4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2.5 min-h-11 text-sm font-ui font-medium text-luxury-charcoal hover:text-brand-orange rounded-xl transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <BrandMark
            logoUrl={logoUrl}
            name={siteName}
            priority
            textClassName="text-brand-orange hover:text-brand-red"
          />
          <div className="flex items-center gap-0.5 justify-end">
            <button
              type="button"
              onClick={() => setLang(lang === "ar" ? "de" : "ar")}
              className="px-2 min-h-11 text-xs font-ui font-semibold text-luxury-charcoal hover:text-brand-orange"
              aria-label={t("langSwitch")}
            >
              {t("langSwitch")}
            </button>
            <Link
              href="/wishlist"
              className="relative p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-luxury-charcoal hover:text-brand-red transition-colors rounded-xl"
              aria-label={t("wishlistCount", { count: wishCount })}
            >
              <Heart size={22} aria-hidden />
              {wishCount > 0 && (
                <span className="absolute top-1 start-1 bg-brand-red text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white/80">
                  {wishCount > 99 ? "99+" : wishCount}
                </span>
              )}
            </Link>
            <Link
              href={user ? "/profile" : "/auth/login"}
              className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-luxury-charcoal hover:text-brand-orange transition-colors rounded-xl"
              aria-label={t("account")}
            >
              <User size={22} />
            </Link>
            {cartLink}
          </div>
        </div>

        <div className="hidden lg:block border-t border-orange-100/80">
          <HeaderSearch open onClose={() => {}} persistent />
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
        >
          <div
            className="absolute inset-0 bg-jmle-mahogany/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute top-0 end-0 h-full w-[min(100%,20rem)] bg-jmle-cream border-s border-orange-200/50 shadow-boutique p-5 animate-fade-up flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <BrandMark
                logoUrl={logoUrl}
                name={siteName}
                textClassName="text-brand-orange hover:text-brand-red"
              />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 min-h-11 min-w-11 hover:text-brand-orange transition-colors rounded-xl"
                aria-label={t("close")}
              >
                <X size={22} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-ui text-gray-500 mb-2 flex items-center gap-1.5">
                <Search size={14} /> {t("quickSearch")}
              </p>
              <HeaderSearch open onClose={() => setMenuOpen(false)} persistent />
            </div>

            <nav className="space-y-1 flex-1 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3.5 min-h-12 text-sm font-ui font-medium text-luxury-charcoal hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="pt-4 mt-auto border-t border-orange-100">
              <button
                type="button"
                onClick={() => setLang(lang === "ar" ? "de" : "ar")}
                className="w-full px-4 py-3.5 min-h-12 text-sm font-ui font-semibold text-luxury-charcoal hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl text-start"
                aria-label={t("langSwitch")}
              >
                {t("langSwitch")}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
