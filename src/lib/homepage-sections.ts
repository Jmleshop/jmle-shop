import type { HomepageSection, HomepageSectionType } from "@/types";

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: "sec-banner1",
    type: "slider",
    title: "",
    zone: "banner1",
    sortOrder: 0,
    active: true,
  },
  {
    id: "sec-brands",
    type: "brands",
    title: "",
    sortOrder: 1,
    active: true,
  },
  {
    id: "sec-banner2",
    type: "slider",
    title: "",
    zone: "banner2",
    sortOrder: 2,
    active: true,
  },
  {
    id: "sec-banner3",
    type: "slider",
    title: "",
    zone: "banner3",
    sortOrder: 3,
    active: true,
  },
  {
    id: "sec-categories",
    type: "categories",
    title: "",
    sortOrder: 4,
    active: true,
  },
  {
    id: "sec-offers",
    type: "products",
    title: "",
    productSource: "offers",
    sortOrder: 5,
    active: true,
  },
  {
    id: "sec-bestsellers",
    type: "products",
    title: "",
    productSource: "bestsellers",
    sortOrder: 6,
    active: true,
  },
];

export function normalizeHomepageSections(
  raw: unknown,
  fallbackTitles?: {
    brands?: string;
    banner2?: string;
    banner3?: string;
    categories?: string;
  }
): HomepageSection[] {
  const list = Array.isArray(raw) ? raw : null;
  if (!list?.length) {
    return DEFAULT_HOMEPAGE_SECTIONS.map((s) => {
      if (s.id === "sec-brands" && fallbackTitles?.brands) {
        return { ...s, title: fallbackTitles.brands };
      }
      if (s.id === "sec-banner2" && fallbackTitles?.banner2) {
        return { ...s, title: fallbackTitles.banner2 };
      }
      if (s.id === "sec-banner3" && fallbackTitles?.banner3) {
        return { ...s, title: fallbackTitles.banner3 };
      }
      if (s.id === "sec-categories" && fallbackTitles?.categories) {
        return { ...s, title: fallbackTitles.categories };
      }
      return { ...s };
    });
  }

  const out: HomepageSection[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const type = String(row.type ?? "").trim() as HomepageSectionType;
    if (!id || !["slider", "single", "brands", "products", "categories"].includes(type)) {
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

  return out.length
    ? out.sort((a, b) => a.sortOrder - b.sortOrder)
    : DEFAULT_HOMEPAGE_SECTIONS.map((s) => ({ ...s }));
}

export function newSectionId(): string {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createHomepageSection(
  type: HomepageSectionType,
  sortOrder: number
): HomepageSection {
  const id = newSectionId();
  const zone = type === "slider" || type === "single" ? id : undefined;
  return {
    id,
    type,
    title: "",
    zone,
    productSource: type === "products" ? "offers" : undefined,
    sortOrder,
    active: true,
  };
}

/** Titles that are placeholders / burned-in junk — never show as overlay */
export function isPlaceholderSlideCaption(text?: string | null): boolean {
  const t = (text ?? "").trim();
  if (!t) return true;
  if (/^banner(\s*\d+)?$/i.test(t)) return true;
  if (/^(slide|folie|platzhalter|untitled|ohne titel)(\s*\d+)?$/i.test(t)) return true;
  if (/^hero(\s*banner)?(\s*\d+)?$/i.test(t)) return true;
  return false;
}
