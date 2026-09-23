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
import type { CartItem, Product } from "@/types";
import type { User } from "@supabase/supabase-js";
import { toast } from "@/components/AppToaster";
import {
  FREE_SHIPPING_THRESHOLD_EUR,
  amountUntilFreeShipping,
  estimateShipping,
  qualifiesForFreeShipping,
} from "@/lib/shipping";
import { formatEuroDe, maxBuyQuantity } from "@/lib/pricing";

interface CartContextType {
  items: CartItem[];
  total: number;
  itemCount: number;
  loading: boolean;
  user: User | null;
  products: Map<string, Product>;
  /** Schwelle Gratisversand (EUR) */
  freeShippingThreshold: number;
  amountUntilFreeShipping: number;
  qualifiesForFreeShipping: boolean;
  estimatedShipping: number;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

const GUEST_CART_KEY = "jmle_guest_cart";

interface GuestCartItem {
  product_id: string;
  quantity: number;
}

function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function setGuestCart(items: GuestCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const supabase = createClient();

  const resolveProduct = useCallback(
    (productId: string): Product | undefined => {
      return products.get(productId);
    },
    [products]
  );

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          setProducts(new Map(data.products.map((p: Product) => [p.id, p])));
        }
      })
      .catch(() => {});
  }, []);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);

    if (currentUser) {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", currentUser.id);

      if (!error && data) {
        const enriched: CartItem[] = data.map((item) => {
          const product = resolveProduct(item.product_id);
          const max = product
            ? maxBuyQuantity(product.stock, product.maxOrderQuantity)
            : Number(item.quantity);
          const quantity = Math.min(Number(item.quantity), Math.max(0, max));
          return {
            ...item,
            quantity,
            product,
          };
        });
        setItems(enriched);
      } else {
        setItems([]);
      }
    } else {
      const guestItems = getGuestCart();
      let changed = false;
      const clamped = guestItems.map((item) => {
        const product = resolveProduct(item.product_id);
        if (!product) return item;
        const max = maxBuyQuantity(product.stock, product.maxOrderQuantity);
        if (item.quantity > max) {
          changed = true;
          return { ...item, quantity: Math.max(0, max) };
        }
        return item;
      }).filter((item) => item.quantity > 0);
      if (changed || clamped.length !== guestItems.length) {
        setGuestCart(clamped);
      }
      setItems(
        clamped.map((item, index) => ({
          id: `guest-${index}`,
          user_id: "guest",
          product_id: item.product_id,
          quantity: item.quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          product: resolveProduct(item.product_id),
        }))
      );
    }
    setLoading(false);
  }, [supabase, resolveProduct]);

  useEffect(() => {
    refreshCart();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        const guestItems = getGuestCart();
        if (guestItems.length > 0) {
          const {
            data: { user: newUser },
          } = await supabase.auth.getUser();
          if (newUser) {
            for (const item of guestItems) {
              await supabase.from("cart_items").upsert(
                {
                  user_id: newUser.id,
                  product_id: item.product_id,
                  quantity: item.quantity,
                },
                { onConflict: "user_id,product_id" }
              );
            }
            localStorage.removeItem(GUEST_CART_KEY);
          }
        }
      }
      refreshCart();
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshCart]);

  useEffect(() => {
    if (products.size > 0) {
      refreshCart();
    }
  }, [products, refreshCart]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      const product = resolveProduct(productId);
      if (product && !product.inStock) {
        toast.error("هذا المنتج غير متوفر حالياً");
        return;
      }

      const max = product
        ? maxBuyQuantity(product.stock, product.maxOrderQuantity)
        : 0;
      if (max < 1) {
        toast.error("الكمية غير متوفرة في المخزون");
        return;
      }

      if (user) {
        const existing = items.find((i) => i.product_id === productId);
        const newQty = Math.min(max, (existing?.quantity ?? 0) + quantity);
        if (newQty <= (existing?.quantity ?? 0)) {
          toast.error(`الحد الأقصى: ${max}`);
          return;
        }

        if (existing) {
          await supabase
            .from("cart_items")
            .update({ quantity: newQty })
            .eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({
            user_id: user.id,
            product_id: productId,
            quantity: Math.min(max, quantity),
          });
        }
      } else {
        const guestCart = getGuestCart();
        const existing = guestCart.find((i) => i.product_id === productId);
        const newQty = Math.min(max, (existing?.quantity ?? 0) + quantity);
        if (newQty <= (existing?.quantity ?? 0)) {
          toast.error(`الحد الأقصى: ${max}`);
          return;
        }

        if (existing) {
          existing.quantity = newQty;
        } else {
          guestCart.push({
            product_id: productId,
            quantity: Math.min(max, quantity),
          });
        }
        setGuestCart(guestCart);
      }
      await refreshCart();
      toast.success(
        product?.name
          ? `تمت إضافة «${product.name}» إلى السلة`
          : "تمت إضافة المنتج إلى السلة"
      );
    },
    [user, items, supabase, refreshCart, resolveProduct]
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (quantity < 1) return;

      const current = items.find((i) => i.id === cartItemId);
      const product = current
        ? resolveProduct(current.product_id)
        : undefined;
      const max = product
        ? maxBuyQuantity(product.stock, product.maxOrderQuantity)
        : quantity;
      const clamped = Math.min(quantity, max);
      if (clamped < 1) return;

      if (user) {
        await supabase
          .from("cart_items")
          .update({ quantity: clamped })
          .eq("id", cartItemId);
      } else {
        const guestCart = getGuestCart();
        const index = parseInt(cartItemId.replace("guest-", ""), 10);
        if (guestCart[index]) {
          guestCart[index].quantity = clamped;
          setGuestCart(guestCart);
        }
      }
      await refreshCart();
    },
    [user, items, supabase, refreshCart, resolveProduct]
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      if (user) {
        await supabase.from("cart_items").delete().eq("id", cartItemId);
      } else {
        const guestCart = getGuestCart();
        const index = parseInt(cartItemId.replace("guest-", ""), 10);
        guestCart.splice(index, 1);
        setGuestCart(guestCart);
      }
      await refreshCart();
      toast("تم حذف المنتج من السلة", { icon: "🛒" });
    },
    [user, supabase, refreshCart]
  );

  const clearCart = useCallback(async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
    await refreshCart();
  }, [user, supabase, refreshCart]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.product?.price ?? 0) * item.quantity,
        0
      ),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const shippingMeta = useMemo(() => {
    const remaining = amountUntilFreeShipping(total);
    const free = qualifiesForFreeShipping(total);
    const shipping = estimateShipping(total);
    return {
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD_EUR,
      amountUntilFreeShipping: remaining,
      qualifiesForFreeShipping: free,
      estimatedShipping: shipping,
    };
  }, [total]);

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        itemCount,
        loading,
        user,
        products,
        ...shippingMeta,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

export function useCartTotal(): number {
  const { total } = useCart();
  return total;
}

export function useCartItemCount(): number {
  const { itemCount } = useCart();
  return itemCount;
}

/** Hilfstext für UI (z. B. Mini-Cart) */
export function formatFreeShippingHint(
  remaining: number,
  qualifies: boolean
): string {
  if (qualifies) return "شحن مجاني ✓";
  return `باقي ${formatEuroDe(remaining)} للشحن المجاني`;
}
