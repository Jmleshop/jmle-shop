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

type FlyPayload = {
  image: string;
  fromRect: DOMRect;
};

type CartFlyContextValue = {
  flyToCart: (payload: FlyPayload) => void;
  cartIconRef: React.RefObject<HTMLElement | null>;
  bumpCart: () => void;
  cartBumping: boolean;
  registerCartIcon: (el: HTMLElement | null) => void;
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
      registerCartIcon: () => {},
    } satisfies CartFlyContextValue;
  }
  return ctx;
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
  const [flying, setFlying] = useState<Flying[]>([]);
  const [cartBumping, setCartBumping] = useState(false);
  const idRef = useRef(0);

  const registerCartIcon = useCallback((el: HTMLElement | null) => {
    cartIconRef.current = el;
  }, []);

  const bumpCart = useCallback(() => {
    setCartBumping(true);
    window.setTimeout(() => setCartBumping(false), 720);
  }, []);

  const flyToCart = useCallback(
    ({ image, fromRect }: FlyPayload) => {
      const target = cartIconRef.current?.getBoundingClientRect();
      if (!target || !image) {
        bumpCart();
        return;
      }
      const id = ++idRef.current;
      const size = 48;
      const startX = fromRect.left + fromRect.width / 2 - size / 2;
      const startY = fromRect.top + fromRect.height / 2 - size / 2;
      const endX = target.left + target.width / 2 - size / 2;
      const endY = target.top + target.height / 2 - size / 2;

      setFlying((prev) => [
        ...prev,
        { id, image, x: startX, y: startY, tx: endX, ty: endY },
      ]);

      window.setTimeout(() => {
        setFlying((prev) => prev.filter((f) => f.id !== id));
        bumpCart();
      }, 900);
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
                className="pointer-events-none fixed z-[200] h-12 w-12 rounded-2xl overflow-hidden shadow-[0_12px_32px_-8px_rgba(255,107,0,0.55)] border-2 border-white ring-2 ring-brand-orange/40"
                style={{
                  left: f.x,
                  top: f.y,
                  ["--fly-x" as string]: `${f.tx - f.x}px`,
                  ["--fly-y" as string]: `${f.ty - f.y}px`,
                  animation:
                    "jmle-fly-to-cart 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image} alt="" className="h-full w-full object-contain bg-white" />
              </div>
            ))}
          </>,
          document.body
        )}
    </CartFlyContext.Provider>
  );
}
