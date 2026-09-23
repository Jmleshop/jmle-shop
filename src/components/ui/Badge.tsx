import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone =
  | "gold"
  | "sale"
  | "success"
  | "neutral"
  | "halal"
  | "organic"
  | "origin";

const toneCls: Record<BadgeTone, string> = {
  gold: "bg-gold/15 text-gold-dark border-amber-200/60",
  sale: "bg-red-600 text-white border-red-700/20",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  neutral: "bg-white/90 text-luxury-charcoal border-amber-200/50",
  halal: "bg-emerald-700 text-white border-emerald-800/30",
  organic: "bg-lime-100 text-lime-900 border-lime-300/60",
  origin: "bg-jmle-mahogany/90 text-jmle-ocher border-jmle-mahogany/40",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  size?: "sm" | "md";
}

export function Badge({
  tone = "gold",
  icon,
  size = "sm",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-ui font-medium border rounded-full whitespace-nowrap",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        toneCls[tone],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

const ORIGIN_LABELS: Record<string, { ar: string; de: string }> = {
  palästina: { ar: "من فلسطين", de: "Aus Palästina" },
  palestine: { ar: "من فلسطين", de: "Aus Palästina" },
  فلسطين: { ar: "من فلسطين", de: "Aus Palästina" },
  syrien: { ar: "من سوريا", de: "Aus Syrien" },
  syria: { ar: "من سوريا", de: "Aus Syrien" },
  سوريا: { ar: "من سوريا", de: "Aus Syrien" },
  türkei: { ar: "من تركيا", de: "Aus der Türkei" },
  turkey: { ar: "من تركيا", de: "Aus der Türkei" },
  تركيا: { ar: "من تركيا", de: "Aus der Türkei" },
};

export function OriginBadge({ country }: { country?: string | null }) {
  if (!country?.trim()) return null;
  const key = country.trim().toLowerCase();
  const mapped = ORIGIN_LABELS[key];
  const label = mapped?.ar ?? `من ${country.trim()}`;
  return (
    <Badge tone="origin" title={mapped?.de ?? country}>
      {label}
    </Badge>
  );
}

export function DiscountBadge({ percent }: { percent?: number | null }) {
  const p = Number(percent ?? 0);
  if (!p || p <= 0) return null;
  return (
    <Badge tone="sale" aria-label={`Rabatt ${p}%`}>
      −{p}%
    </Badge>
  );
}

export function SealBadge({
  type,
}: {
  type: "halal" | "organic";
}) {
  if (type === "halal") {
    return (
      <Badge tone="halal" title="حلال / Halal">
        حلال
      </Badge>
    );
  }
  return (
    <Badge tone="organic" title="عضوي / Bio">
      عضوي
    </Badge>
  );
}

/** Boutique-Siegel für typische Herkunftsländer (ohne Bio-Claim ohne Daten) */
export function isArabicBoutiqueOrigin(country?: string | null): boolean {
  if (!country) return false;
  const k = country.trim().toLowerCase();
  return Boolean(ORIGIN_LABELS[k]);
}
