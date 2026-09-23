"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { maxBuyQuantity } from "@/lib/pricing";
import { Button } from "@/components/ui";

export default function AddToCartButton({
  productId,
  stock,
  maxOrderQuantity,
}: {
  productId: string;
  stock: number;
  maxOrderQuantity: number | null;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const max = maxBuyQuantity(stock, maxOrderQuantity);
  const options = useMemo(
    () => Array.from({ length: max }, (_, i) => i + 1),
    [max]
  );
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (qty > max && max >= 1) setQty(max);
    if (max < 1) setQty(1);
  }, [max, qty]);

  if (stock <= 0 || max < 1) {
    return (
      <p className="text-center md:text-start font-ui font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-xl py-3.5 px-4 min-h-12">
        نفذ من المخزون · Ausverkauft
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
      <label className="text-sm text-gray-600 font-ui flex items-center gap-2 min-h-12">
        الكمية
        <select
          value={Math.min(qty, max)}
          onChange={(e) => setQty(Number(e.target.value))}
          className="input-field py-2 w-24 min-h-12"
          aria-label="الكمية"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <Button
        onClick={handleClick}
        size="lg"
        fullWidth
        className={
          added
            ? "bg-emerald-600 hover:bg-emerald-600 text-white shadow-none sm:w-auto"
            : "sm:w-auto sm:min-w-[200px]"
        }
        leadingIcon={
          added ? <Check size={18} aria-hidden /> : <ShoppingBag size={18} aria-hidden />
        }
      >
        {added ? "تمت الإضافة" : "أضف للسلة"}
      </Button>
    </div>
  );
}
