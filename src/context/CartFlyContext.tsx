"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

type FlyPayload = {
  image: string;
  fromRect: DOMRect;
};

type CartFlyContextValue = {
  flyToCart: (payload: FlyPayload) => void;
  cartIconRef: React.RefObject<HTMLElement | null>;
  bumpCart: () => void;
  cartBumping: boolean;
  registerCartIcon: (el: HTMLElement | null) => () => void;
};

const CartFlyContext = createContext<CartFlyContextValue | null>(null);

export function useCartFly() {
  const ctx = useContext(CartFlyContext);
  if (!ctx) {
    return {
      flyToCart: () => {},
      cartIconRef: { current: null },
      bumpCart: () => {},
      cartBumping: false,
      registerCartIcon: () => () => {},
    } satisfies CartFlyContextValue;
  }
  return ctx;
}

function pickVisibleCartIcon(icons: Set<HTMLElement>): HTMLElement | null {
  const visible = [...icons].filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  });
  if (visible.length === 0) return null;
  if (window.innerWidth < 768) {
    return visible.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
  }
  return visible.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
}

type Flying = {
  id: number;
  image: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

export function CartFlyProvider({ children }: { children: ReactNode }) {
  const cartIconRef = useRef<HTMLElement | null>(null);
  const iconsRef = useRef<Set<HTMLElement>>(new Set());
  const [flying, setFlying] = useState<Flying[]>([]);
  const [cartBumping, setCartBumping] = useState(false);
  const idRef = useRef(0);

  const registerCartIcon = useCallback((el: HTMLElement | null) => {
    if (!el) return () => {};
    iconsRef.current.add(el);
    cartIconRef.current = el;
    return () => {
      iconsRef.current.delete(el);
    };
  }, []);

  const bumpCart = useCallback(() => {
    setCartBumping(true);
    window.setTimeout(() => setCartBumping(false), 520);
  }, []);

  const flyToCart = useCallback(
    ({ image, fromRect }: FlyPayload) => {
      const target = pickVisibleCartIcon(iconsRef.current)?.getBoundingClientRect();
      if (!target || !image) {
        bumpCart();
        return;
      }
      const id = ++idRef.current;
      const startX = fromRect.left + fromRect.width / 2 - 20;
      const startY = fromRect.top + fromRect.height / 2 - 20;
      const endX = target.left + target.width / 2 - 20;
      const endY = target.top + target.height / 2 - 20;

      setFlying((prev) => [
        ...prev,
        { id, image, x: startX, y: startY, tx: endX, ty: endY },
      ]);

      window.setTimeout(() => {
        setFlying((prev) => prev.filter((f) => f.id !== id));
        bumpCart();
      }, 700);
    },
    [bumpCart]
  );

  return (
    <CartFlyContext.Provider
      value={{ flyToCart, cartIconRef, bumpCart, cartBumping, registerCartIcon }}
    >
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {flying.map((f) => (
              <div
                key={f.id}
                className="pointer-events-none fixed z-[200] h-10 w-10 rounded-xl overflow-hidden shadow-lg border-2 border-white"
                style={{
                  left: f.x,
                  top: f.y,
                  ["--fly-x" as string]: `${f.tx - f.x}px`,
                  ["--fly-y" as string]: `${f.ty - f.y}px`,
                  animation: "jmle-fly-to-cart 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              >
                <Image src={f.image} alt="" fill className="object-cover" sizes="40px" />
              </div>
            ))}
          </>,
          document.body
        )}
    </CartFlyContext.Provider>
  );
}
