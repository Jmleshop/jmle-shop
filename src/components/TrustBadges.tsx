"use client";

import { Lock, Truck, Leaf } from "lucide-react";
import { useShopLocale } from "@/components/ShopLocale";

const BADGES = [
  { key: "trustSecure" as const, Icon: Lock },
  { key: "trustShipping" as const, Icon: Truck },
  { key: "trustFresh" as const, Icon: Leaf },
];

/** Dezente Vertrauenselemente unter dem Warenkorb-Button. */
export default function TrustBadges({ className = "" }: { className?: string }) {
  const { t } = useShopLocale();

  return (
    <ul
      className={`grid grid-cols-3 gap-2 mt-4 ${className}`}
      aria-label={t("trustBadgesLabel")}
    >
      {BADGES.map(({ key, Icon }) => (
        <li
          key={key}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-200/40 bg-white/60 px-2 py-3 text-center"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jmle-warm text-gold">
            <Icon size={16} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-[11px] leading-snug font-ui text-luxury-charcoal">
            {t(key)}
          </span>
        </li>
      ))}
    </ul>
  );
}
