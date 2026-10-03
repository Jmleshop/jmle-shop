"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle } from "@/lib/shop-i18n";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

type Suggestion = {
  id: string;
  name: string;
  nameDe?: string;
  image: string;
  price: number;
  discountPercent: number;
};

const DEBOUNCE_MS = 280;

export default function HeaderSearch({
  open,
  onClose,
  persistent = false,
  /** Kompakt in der Header-Zeile (Desktop/Mobile) */
  inline = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Immer sichtbar — kein Auto-Focus */
  persistent?: boolean;
  inline?: boolean;
}) {
  const { lang, t } = useShopLocale();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const active = persistent || open;
  const qTrim = query.trim();
  const showPanel = qTrim.length >= 2 && (loading || searched);

  useEffect(() => {
    if (!persistent && open) {
      inputRef.current?.focus();
    }
    if (!persistent && !open) {
      setQuery("");
      setItems([]);
      setSearched(false);
      setActiveIndex(-1);
    }
  }, [open, persistent]);

  useEffect(() => {
    if (!active) return;
    if (qTrim.length < 2) {
      setItems([]);
      setLoading(false);
      setSearched(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setSearched(false);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(qTrim)}&limit=8`,
          { signal: ac.signal }
        );
        const data = (await res.json()) as { products?: Suggestion[] };
        startTransition(() => {
          setItems(data.products ?? []);
          setLoading(false);
          setSearched(true);
          setActiveIndex(-1);
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setItems([]);
          setLoading(false);
          setSearched(true);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, active, qTrim]);

  if (!active) return null;

  const goSearch = () => {
    if (!qTrim) return;
    if (!persistent) onClose();
    router.push(`/search?q=${encodeURIComponent(qTrim)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && items[activeIndex]) {
      if (!persistent) onClose();
      router.push(`/products/${items[activeIndex].id}`);
      return;
    }
    goSearch();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || (!items.length && !searched)) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setActiveIndex(-1);
      if (!persistent) onClose();
    }
  };

  return (
    <div
      className={cn(
        "relative z-[55] w-full",
        inline
          ? "min-w-0 px-0 py-0"
          : persistent
            ? "px-4 py-2.5 max-w-3xl mx-auto"
            : "px-4 pb-3 animate-fade-up"
      )}
    >
      <form
        onSubmit={handleSubmit}
        className={cn("relative w-full", !inline && !persistent && "max-w-lg mx-auto")}
        role="search"
      >
        <label htmlFor={inputId} className="sr-only">
          {t("searchLabel")}
        </label>
        <div className="relative">
          <span
            className={cn(
              "pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-gold/80",
              inline ? "start-2.5" : "start-3"
            )}
          >
            {loading ? (
              <Loader2 size={inline ? 16 : 18} className="animate-spin" aria-hidden />
            ) : (
              <Search size={inline ? 16 : 18} aria-hidden />
            )}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            role="combobox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showPanel}
            aria-haspopup="listbox"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
            }
            className={cn(
              "w-full bg-white border border-amber-200/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20",
              inline
                ? "min-h-9 sm:min-h-10 ps-9 pe-3 py-1.5 text-sm rounded-full shadow-sm"
                : "min-h-12 ps-10 pe-4 py-2.5 text-sm rounded-full"
            )}
          />
        </div>

        {showPanel && (
          <ul
            id={listId}
            role="listbox"
            className={cn(
              "absolute inset-x-0 top-full mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-amber-200/50 bg-white shadow-boutique z-[60]",
              inline && "min-w-[min(100%,22rem)] sm:min-w-[20rem]"
            )}
          >
            {!loading && searched && items.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500 font-ui text-center">
                {t("searchNoHits", { query: qTrim })}
              </li>
            )}
            {items.map((item, index) => {
              const onSale = item.discountPercent > 0;
              const listPrice = onSale
                ? item.price / (1 - item.discountPercent / 100)
                : item.price;
              return (
                <li
                  key={item.id}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <Link
                    href={`/products/${item.id}`}
                    onClick={() => {
                      if (!persistent) onClose();
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 min-h-12 transition-colors",
                      activeIndex === index
                        ? "bg-jmle-warm"
                        : "hover:bg-jmle-warm"
                    )}
                  >
                    <span className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-jmle-warm">
                      <Image
                        src={originalImageSrc(item.image)}
                        alt=""
                        fill
                        unoptimized
                        quality={SHOP_IMAGE_QUALITY}
                        className="object-contain"
                        sizes="40px"
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-start">
                      <span className="block text-sm font-ui text-luxury-ink truncate">
                        {productTitle(lang, item)}
                      </span>
                      {item.nameDe && lang === "ar" && (
                        <span
                          className="block text-[11px] text-gray-400 truncate"
                          dir="ltr"
                        >
                          {item.nameDe}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-ui font-semibold text-gold shrink-0 text-end">
                      {formatEuroDe(item.price)}
                      {onSale && (
                        <span className="block text-[10px] font-normal text-gray-400 line-through">
                          {formatEuroDe(listPrice)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
            {qTrim.length >= 2 && (
              <li className="border-t border-amber-100">
                <button
                  type="submit"
                  className="w-full text-center py-2.5 text-sm font-ui text-gold hover:bg-jmle-warm min-h-11"
                >
                  {t("searchViewAll", { query: qTrim })}
                </button>
              </li>
            )}
          </ul>
        )}
      </form>
    </div>
  );
}
