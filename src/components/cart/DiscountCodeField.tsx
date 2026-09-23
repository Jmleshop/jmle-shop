"use client";

import { useState } from "react";
import { Tag, X, Loader2, Check } from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";
import { Button, Input } from "@/components/ui";
import { toast } from "@/components/AppToaster";

export type AppliedDiscount = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  amount: number;
};

export default function DiscountCodeField({
  subtotal,
  applied,
  onApply,
  onClear,
}: {
  subtotal: number;
  applied: AppliedDiscount | null;
  onApply: (discount: AppliedDiscount) => void;
  onClear: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = async () => {
    setError("");
    const trimmed = code.trim();
    if (!trimmed) {
      setError("الرجاء إدخال رمز الخصم");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        const msg = data.error || "رمز الخصم غير صالح";
        setError(msg);
        toast.error(msg);
        return;
      }
      onApply({
        code: data.code,
        type: data.type,
        value: data.value,
        amount: data.discountAmount,
      });
      setCode("");
      toast.success(`تم تطبيق الخصم: −${formatEuroDe(data.discountAmount)}`);
    } catch {
      setError("تعذر التحقق من الرمز");
      toast.error("تعذر التحقق من الرمز");
    } finally {
      setLoading(false);
    }
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Check size={18} className="text-emerald-600 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-ui font-medium text-emerald-900 truncate">
              {applied.code}
            </p>
            <p className="text-xs text-emerald-700">
              −{formatEuroDe(applied.amount)}
              {applied.type === "percent" ? ` (${applied.value}%)` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-2 min-h-10 min-w-10 rounded-lg text-emerald-800 hover:bg-emerald-100"
          aria-label="إزالة رمز الخصم"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-ui text-luxury-charcoal flex items-center gap-1.5">
        <Tag size={14} className="text-gold" aria-hidden />
        رمز الخصم / Gutscheincode
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="CODE"
          dir="ltr"
          className="font-mono tracking-wider"
          aria-invalid={error ? true : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void validate();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void validate()}
          disabled={loading}
          className="sm:shrink-0"
          leadingIcon={
            loading ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : undefined
          }
        >
          تطبيق
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-600 font-ui" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
