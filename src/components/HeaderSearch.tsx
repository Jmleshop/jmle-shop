"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";
import { cn } from "@/lib/cn";

type Suggestion = {
  id: string;
  name: string;
  nameDe?: string;
  image: string;
  price: number;
  discountPercent: number;
};

const DEBOUNCE_MS = 300;

export default function HeaderSearch({
  open,
  onClose,
  persistent = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Immer sichtbar (Tablet/Desktop-Leiste) — kein Auto-Focus */
  persistent?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const active = persistent || open;

  useEffect(() => {
    if (!persistent && open) {
      inputRef.current?.focus();
    }
    if (!persistent && !open) {
      setQuery("");
      setItems([]);
    }
  }, [open, persistent]);

  useEffect(() => {
    if (!active) return;
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal }
        );
        const data = (await res.json()) as { products?: Suggestion[] };
        startTransition(() => {
          setItems(data.products ?? []);
          setLoading(false);
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setItems([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, active]);

  if (!active) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (!persistent) onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      className={cn(
        "px-4 relative z-[55]",
        persistent ? "py-2.5 max-w-3xl mx-auto w-full" : "pb-3 animate-fade-up"
      )}
    >
      <form
        onSubmit={handleSubmit}
        className={cn("relative", persistent ? "w-full" : "max-w-lg mx-auto")}
        role="search"
      >
        <label htmlFor={inputId} className="sr-only">
          بحث عن منتج
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gold/80">
            {loading ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Search size={18} aria-hidden />
            )}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={items.length > 0}
            className="w-full min-h-12 ps-10 pe-4 py-2.5 text-sm bg-white border border-amber-200/50 rounded-full focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>

        {(items.length > 0 || (loading && query.trim().length >= 2)) && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full mt-2 max-h-80 overflow-y-auto rounded-2xl border border-amber-200/50 bg-white shadow-boutique z-[60]"
          >
            {items.map((item) => (
              <li key={item.id} role="option">
                <Link
                  href={`/products/${item.id}`}
                  onClick={() => {
                    if (!persistent) onClose();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 min-h-14 hover:bg-jmle-warm transition-colors"
                >
                  <span className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-jmle-warm">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block text-sm font-ui text-luxury-ink truncate">
                      {item.name}
                    </span>
                    {item.nameDe && (
                      <span
                        className="block text-[11px] text-gray-400 truncate"
                        dir="ltr"
                      >
                        {item.nameDe}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-ui font-semibold text-gold shrink-0">
                    {formatEuroDe(item.price)}
                  </span>
                </Link>
              </li>
            ))}
            {query.trim().length >= 2 && (
              <li className="border-t border-amber-100">
                <button
                  type="submit"
                  className="w-full text-center py-3 text-sm font-ui text-gold hover:bg-jmle-warm min-h-12"
                >
                  عرض كل النتائج لـ «{query.trim()}»
                </button>
              </li>
            )}
          </ul>
        )}
      </form>
    </div>
  );
}
