"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "@/components/AppToaster";

const STORAGE_KEY = "jmle_wishlist";

interface WishlistContextType {
  ids: string[];
  count: number;
  loading: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

function readGuest(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.map(String).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function writeGuest(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  const loadForUser = useCallback(
    async (u: User | null) => {
      if (u) {
        const { data, error } = await supabase
          .from("wishlist_items")
          .select("product_id")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setIds(data.map((r) => String(r.product_id)));
        } else {
          // Tabelle evtl. noch nicht migriert → Guest-Fallback
          setIds(readGuest());
        }
      } else {
        setIds(readGuest());
      }
    },
    [supabase]
  );

  const mergeGuestIntoDb = useCallback(
    async (u: User) => {
      const guest = readGuest();
      if (!guest.length) return;
      const rows = guest.map((product_id) => ({
        user_id: u.id,
        product_id,
      }));
      await supabase.from("wishlist_items").upsert(rows, {
        onConflict: "user_id,product_id",
        ignoreDuplicates: true,
      });
      localStorage.removeItem(STORAGE_KEY);
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(u);
      if (u) await mergeGuestIntoDb(u);
      if (cancelled) return;
      await loadForUser(u);
      if (!cancelled) setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" && u) {
        await mergeGuestIntoDb(u);
      }
      await loadForUser(u);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadForUser, mergeGuestIntoDb]);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  const toggle = useCallback(
    async (productId: string) => {
      const exists = ids.includes(productId);
      if (user) {
        if (exists) {
          await supabase
            .from("wishlist_items")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", productId);
          setIds((prev) => prev.filter((id) => id !== productId));
          toast("تمت الإزالة من المفضلة");
        } else {
          const { error } = await supabase.from("wishlist_items").insert({
            user_id: user.id,
            product_id: productId,
          });
          if (error) {
            toast.error("تعذر الحفظ في المفضلة");
            return;
          }
          setIds((prev) => [productId, ...prev.filter((id) => id !== productId)]);
          toast.success("أضيف إلى المفضلة");
        }
      } else {
        const next = exists
          ? ids.filter((id) => id !== productId)
          : [productId, ...ids];
        writeGuest(next);
        setIds(next);
        toast(exists ? "تمت الإزالة من المفضلة" : "أضيف إلى المفضلة ❤️");
      }
    },
    [ids, user, supabase]
  );

  const remove = useCallback(
    async (productId: string) => {
      if (!ids.includes(productId)) return;
      if (user) {
        await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
      }
      const next = ids.filter((id) => id !== productId);
      if (!user) writeGuest(next);
      setIds(next);
    },
    [ids, user, supabase]
  );

  const clear = useCallback(async () => {
    if (user) {
      await supabase.from("wishlist_items").delete().eq("user_id", user.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIds([]);
  }, [user, supabase]);

  const value = useMemo(
    () => ({
      ids,
      count: ids.length,
      loading,
      has,
      toggle,
      remove,
      clear,
    }),
    [ids, loading, has, toggle, remove, clear]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
