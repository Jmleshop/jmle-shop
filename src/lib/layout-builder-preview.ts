/**
 * Leichte Preview-Helfer für Client-Bundles (vermeidet schwere Admin-Importe).
 * Re-exportiert Message-Konstanten + sichere Section-Normalisierung.
 */
export {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_STRUCTURE,
  LAYOUT_PREVIEW_EDIT,
  LAYOUT_PREVIEW_READY,
  LAYOUT_PREVIEW_PING,
  type LayoutDocument,
} from "@/lib/layout-builder";

import type { HomepageSection, HomepageSectionType } from "@/types";

/** Minimale Normalisierung für Builder-Preview (Client-sicher). */
export function normalizeHomepageSectionsSafe(
  raw: unknown
): HomepageSection[] {
  if (!Array.isArray(raw)) return [];
  const out: HomepageSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const type = String(row.type ?? "").trim() as HomepageSectionType;
    if (
      !id ||
      !["slider", "single", "brands", "products", "categories"].includes(type)
    ) {
      continue;
    }
    out.push({
      id,
      type,
      title: String(row.title ?? "").trim(),
      titleDe: row.titleDe != null ? String(row.titleDe) : undefined,
      titleAr: row.titleAr != null ? String(row.titleAr) : undefined,
      zone:
        type === "slider" || type === "single"
          ? String(row.zone ?? id).trim() || id
          : undefined,
      productSource:
        type === "products"
          ? row.productSource === "bestsellers" || row.productSource === "all"
            ? row.productSource
            : "offers"
          : undefined,
      sortOrder: Number(row.sortOrder ?? out.length) || 0,
      active: row.active !== false,
    });
  }
  return out;
}
