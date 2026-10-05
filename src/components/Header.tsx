"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { User, ShoppingBag, Menu, X, Heart, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCartFly } from "@/context/CartFlyContext";
import { useShopLocale } from "@/components/ShopLocale";
import { formatPrice } from "@/lib/catalog";
import HeaderSearch from "@/components/HeaderSearch";
import BrandMark from "@/components/BrandMark";
import CategoryNavTree from "@/components/CategoryNavTree";
import { cn } from "@/lib/cn";
import type { Category } from "@/types";
import {
  defaultLayoutDocument,
  type LayoutDocument,
} from "@/lib/layout-builder";

export default function Header({
  logoUrl = "",
  siteName = "jmle",
  layout: layoutProp,
  categories = [],
}: {
  logoUrl?: string;
  siteName?: string;
  layout?: LayoutDocument | null;
  categories?: Category[];
}) {
  const layout = layoutProp ?? defaultLayoutDocument();
  const { total, itemCount, user } = useCart();
  const { count: wishCount } = useWishlist();
  const { lang, setLang, t } = useShopLocale();
  const { registerCartIcon, cartBumping } = useCartFly();
  const cartRef = useRef<HTMLAnchorElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartPos, setCartPos] = useState(layout.chrome.cartPosition);

  useEffect(() => {
    registerCartIcon(cartRef.current);
  }, [registerCartIcon, itemCount]);

  useEffect(() => {
    const read = () => {
      const v = document.documentElement.dataset.layoutCart;
      if (v === "start" || v === "end") setCartPos(v);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-layout-cart"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setCartPos(layout.chrome.cartPosition);
  }, [layout.chrome.cartPosition]);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > 12);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("products") },
    { href: "/wishlist", label: t("wishlist") },
    { href: "/cart", label: t("cart") },
    { href: "/search", label: t("search") },
    {
      href: user ? "/profile" : "/auth/login",
      label: user ? t("account") : t("login"),
    },
  ];

  const headerStyle = layout.chrome.headerBg
    ? { backgroundColor: "var(--layout-header-bg)" }
    : undefined;

  const iconBtn =
    "p-1.5 min-h-9 min-w-9 inline-flex items-center justify-center text-luxury-charcoal hover:text-brand-orange transition-colors rounded-lg";

  const menuButton = (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      className={iconBtn}
      aria-label={t("menu")}
      aria-expanded={menuOpen}
      aria-controls="shop-burger-menu"
    >
      <Menu size={20} />
    </button>
  );

  const searchButton = (
    <button
      type="button"
      onClick={() => setSearchOpen((v) => !v)}
      className={cn(iconBtn, searchOpen && "text-brand-orange")}
      aria-label={t("search")}
      aria-expanded={searchOpen}
      aria-controls="header-search-panel"
    >
      {searchOpen ? <X size={18} /> : <Search size={18} />}
    </button>
  );

  const cartLink = (
    <Link
      ref={cartRef}
      href="/cart"
      className={cn(
        "relative flex items-center gap-1 p-1.5 min-h-9 text-luxury-charcoal hover:text-brand-orange transition-colors rounded-lg",
        cartBumping && "animate-cart-bump text-brand-red"
      )}
      aria-label={t("cartCount", { count: itemCount })}
      data-cart-icon
    >
      <ShoppingBag size={18} aria-hidden />
      {itemCount > 0 && (
        <span
          className={cn(
            "absolute top-0 start-0 bg-brand-red text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white/80",
            cartBumping && "animate-cart-glow"
          )}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
      <span className="text-xs font-ui font-semibold whitespace-nowrap hidden xl:inline">
        {formatPrice(total, lang === "de" ? "de-DE" : "ar-DE")}
      </span>
    </Link>
  );

  const wishLink = (
    <Link
      href="/wishlist"
      className={cn(iconBtn, "relative hover:text-brand-red")}
      aria-label={t("wishlistCount", { count: wishCount })}
    >
      <Heart size={18} aria-hidden />
      {wishCount > 0 && (
        <span className="absolute top-0 start-0 bg-brand-red text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white/80">
          {wishCount > 99 ? "99+" : wishCount}
        </span>
      )}
    </Link>
  );

  const accountLink = (
    <Link
      href={user ? "/profile" : "/auth/login"}
      className={iconBtn}
      aria-label={user ? t("account") : t("login")}
    >
      <User size={18} />
    </Link>
  );

  const langButton = (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "de" : "ar")}
      className="px-1.5 min-h-9 text-xs font-ui font-semibold text-luxury-charcoal hover:text-brand-orange"
      aria-label={t("langSwitch")}
    >
      {t("langSwitch")}
    </button>
  );

  const iconTrail =
    cartPos === "start" ? (
      <>
        {cartLink}
        {langButton}
        {wishLink}
        {searchButton}
        {accountLink}
      </>
    ) : (
      <>
        {langButton}
        {wishLink}
        {searchButton}
        {accountLink}
        {cartLink}
      </>
    );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 isolate bg-jmle-cream/95 backdrop-blur-md border-b border-orange-200/50",
          "supports-[backdrop-filter]:bg-jmle-cream/90",
          "transition-[box-shadow,background-color] duration-200 ease-out will-change-transform",
          "[transform:translateZ(0)]",
          scrolled && "shadow-gold-sm bg-jmle-cream/98",
          "layout-chrome-header"
        )}
        style={headerStyle}
      >
        {/* Desktop: Logo · Nav · Icons — Suche per Icon-Toggle */}
        <div
          className="hidden lg:flex max-w-7xl mx-auto px-4 items-center layout-chrome-navbar layout-header-row-desktop"
          style={
            layout.chrome.navbarBg
              ? { backgroundColor: "var(--layout-navbar-bg)" }
              : undefined
          }
        >
          <div className="flex items-center gap-1 shrink-0 min-w-0">
            {menuButton}
            <BrandMark
              logoUrl={logoUrl}
              name={siteName}
              priority
              textClassName="text-brand-orange hover:text-brand-red"
            />
            <nav
              className="ms-1 flex items-center gap-0.5"
              aria-label={t("mainNav")}
            >
              {navLinks.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2 py-1.5 min-h-9 text-sm font-ui font-medium text-luxury-charcoal hover:text-brand-orange rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5 justify-end shrink-0">
            {iconTrail}
          </div>
        </div>

        {/* Mobile: eine schlanke Zeile — Suche per Icon */}
        <div className="lg:hidden max-w-7xl mx-auto px-3 flex items-center gap-1 layout-header-row-mobile">
          <div className="flex items-center gap-0.5 shrink-0 w-[4.5rem]">
            {cartPos === "start" ? cartLink : accountLink}
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <BrandMark
              logoUrl={logoUrl}
              name={siteName}
              priority
              textClassName="text-brand-orange hover:text-brand-red"
            />
          </div>
          <div className="flex items-center justify-end gap-0.5 shrink-0 min-w-[4.5rem]">
            {searchButton}
            {cartPos === "start" ? (
              <>
                {accountLink}
                {menuButton}
              </>
            ) : (
              <>
                {cartLink}
                {menuButton}
              </>
            )}
          </div>
        </div>

        {searchOpen ? (
          <div
            id="header-search-panel"
            className="border-t border-orange-100/80 bg-jmle-cream/98"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
              <HeaderSearch
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                inline
              />
            </div>
          </div>
        ) : null}
      </header>

      {searchOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-jmle-mahogany/20 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
          aria-label={t("close")}
          onClick={() => setSearchOpen(false)}
        />
      ) : null}

      {menuOpen && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          id="shop-burger-menu"
        >
          <div
            className="absolute inset-0 bg-jmle-mahogany/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute top-0 end-0 h-full w-[min(100%,22rem)] bg-jmle-cream border-s border-orange-200/50 shadow-boutique p-5 animate-fade-up flex flex-col">
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

            <nav className="space-y-1 flex-1 overflow-y-auto">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3.5 min-h-12 text-sm font-ui font-medium text-luxury-charcoal hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
              >
                {t("home")}
              </Link>
              <Link
                href="/products"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3.5 min-h-12 text-sm font-ui font-medium text-luxury-charcoal hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
              >
                {t("products")}
              </Link>
              <CategoryNavTree
                categories={categories}
                onNavigate={() => setMenuOpen(false)}
              />
              {navLinks
                .filter((l) => !["/", "/products"].includes(l.href))
                .map((link) => (
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
