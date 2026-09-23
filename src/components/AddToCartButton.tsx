"use client";

import { useMemo, useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { maxBuyQuantity } from "@/lib/pricing";

export default function AddToCartButton({
  productId,
  stock,
  maxOrderQuantity,
}: {
  productId: string;
  stock: number;
  maxOrderQuantity: number;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const max = maxBuyQuantity(stock, maxOrderQuantity);
  const options = useMemo(
    () => Array.from({ length: max }, (_, i) => i + 1),
    [max]
  );
  const [qty, setQty] = useState(1);

  if (stock <= 0 || max < 1) {
    return (
      <p className="text-center md:text-right font-medium text-gray-700 bg-gray-100 rounded-xl py-3 px-4">
        Ausverkauft
      </p>
    );
  }

  const handleClick = async () => {
    await addItem(productId, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <label className="text-sm text-gray-600 flex items-center gap-2">
        Menge
        <select
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="input-field py-2 w-24"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3.5 text-sm font-medium rounded-xl transition-all duration-300 ${
          added
            ? "bg-green-600 text-white"
            : "bg-gold text-white hover:bg-jmle-yellow hover:text-luxury-black"
        }`}
      >
        {added ? (
          <>
            <Check size={18} />
            تمت الإضافة
          </>
        ) : (
          <>
            <ShoppingBag size={18} />
            أضف للسلة
          </>
        )}
      </button>
    </div>
  );
}
