import { BRAND_CATALOG } from "@/lib/brand-catalog";
import { resolveProductBrandId } from "@/lib/brand-link";
import { normalizeMatchText } from "@/lib/brand-match";
import type { FoodProduct } from "@/types";

const HEADERS = [
  "id",
  "name_ar",
  "name_de",
  "price",
  "vat_rate",
  "stock_quantity",
  "barcode",
  "product_number",
  "category_id",
  "brand_id",
  "brand_name",
  "suggested_brand",
  "weight_value",
  "weight_unit",
] as const;

/** Fields that can be written back from CSV (suggested_brand is export-only). */
const EDIT_FIELDS = [
  "name_ar",
  "name_de",
  "price",
  "vat_rate",
  "stock_quantity",
  "barcode",
  "product_number",
  "category_id",
  "brand_id",
  "brand_name",
  "weight_value",
  "weight_unit",
] as const;

const REQUIRED_FIELDS = new Set(["name_ar", "price", "vat_rate", "category_id"]);
const NUMBER_FIELDS = new Set(["price", "vat_rate", "stock_quantity", "weight_value"]);

export type BrandCsvOption = { id: string; name: string };

export type CsvChange = {
  id: string;
  name: string;
  field: string;
  from: string;
  to: string;
};

export type CsvIssue = { row: number; message: string };

export type CsvUpdate = {
  id: string;
  fields: Record<string, string | number | null>;
  /** Brand display name that must be created on apply when missing. */
  createBrandName?: string | null;
};

function fieldText(value: unknown): string {
  return value == null ? "" : String(value);
}

function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function brandNameById(
  brands: BrandCsvOption[],
  brandId: string | null | undefined
): string {
  if (!brandId) return "";
  return brands.find((b) => b.id === brandId)?.name ?? "";
}

function findBrandByName(
  brands: BrandCsvOption[],
  name: string
): BrandCsvOption | undefined {
  const norm = normalizeMatchText(name);
  if (!norm) return undefined;
  return brands.find((b) => normalizeMatchText(b.name) === norm);
}

/** Alias-based suggestion for Excel review (empty brand / mismatch check). */
export function suggestedBrandForProduct(
  product: FoodProduct,
  brands: BrandCsvOption[] = []
): string {
  const catalogId = resolveProductBrandId({
    id: product.id,
    name: product.name_ar,
    nameDe: product.name_de,
    description: product.description,
    ingredients: product.ingredients,
    brandId: null,
  });
  if (!catalogId) return "";
  const seed = BRAND_CATALOG.find((b) => b.id === catalogId);
  if (!seed) return catalogId;
  const logo =
    brands.find((b) => b.id === catalogId) ||
    brands.find(
      (b) => normalizeMatchText(b.name) === normalizeMatchText(seed.name)
    ) ||
    brands.find((b) =>
      seed.aliases.some((a) => normalizeMatchText(a) === normalizeMatchText(b.name))
    );
  return logo?.name || seed.name;
}

export function productsToCsv(
  products: FoodProduct[],
  brands: BrandCsvOption[] = []
): string {
  const lines = [HEADERS.join(",")];
  for (const product of products) {
    const row = HEADERS.map((key) => {
      if (key === "brand_name") {
        return cell(brandNameById(brands, product.brand_id));
      }
      if (key === "suggested_brand") {
        return cell(suggestedBrandForProduct(product, brands));
      }
      return cell(product[key as keyof FoodProduct]);
    });
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field.trim());
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char !== "\r") field += char;
  }
  if (field.length || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows[0].map((item) => item.trim());
  return rows
    .slice(1)
    .filter((cells) => cells.some(Boolean))
    .map((cells) => {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = cells[index] ?? "";
      });
      return record;
    });
}

function parseField(
  field: (typeof EDIT_FIELDS)[number],
  raw: string
):
  | { ok: true; value: string; stored: string | number | null }
  | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) {
    if (REQUIRED_FIELDS.has(field)) return { ok: false, message: `${field} ist leer` };
    return { ok: true, value: "", stored: null };
  }
  if (field === "brand_id" || field === "brand_name") {
    return { ok: true, value: text, stored: text };
  }
  if (!NUMBER_FIELDS.has(field)) return { ok: true, value: text, stored: text };
  const number = Number(text.replace(",", "."));
  if (!Number.isFinite(number)) return { ok: false, message: `${field} ist keine Zahl` };
  if (field === "price" && number <= 0) return { ok: false, message: "ungültiger Preis" };
  if (field === "vat_rate" && (number < 0 || number > 100)) {
    return { ok: false, message: "ungültiger MwSt.-Satz" };
  }
  if (field === "stock_quantity" && (!Number.isInteger(number) || number < 0)) {
    return { ok: false, message: "ungültiger Bestand" };
  }
  return { ok: true, value: String(number), stored: number };
}

export function previewCsvEdits(
  products: FoodProduct[],
  rows: Record<string, string>[],
  brands: BrandCsvOption[] = []
): { changes: CsvChange[]; issues: CsvIssue[]; updates: CsvUpdate[] } {
  const byId = new Map(products.map((product) => [product.id, product]));
  const brandIds = new Set(brands.map((b) => b.id));
  const changes: CsvChange[] = [];
  const issues: CsvIssue[] = [];
  const updates: CsvUpdate[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const id = row.id?.trim() ?? "";
    if (!id) {
      issues.push({ row: line, message: "fehlende Produkt-ID" });
      return;
    }
    const product = byId.get(id);
    if (!product) {
      issues.push({ row: line, message: `Produkt ${id} nicht gefunden` });
      return;
    }
    const rowChanges: CsvChange[] = [];
    const fields: Record<string, string | number | null> = {};
    let createBrandName: string | null = null;

    for (const field of EDIT_FIELDS) {
      if (field === "brand_id" || field === "brand_name") continue;
      if (!(field in row) || row[field].trim() === "") continue;
      const parsed = parseField(field, row[field]);
      if (!parsed.ok) {
        issues.push({ row: line, message: parsed.message });
        return;
      }
      const current = fieldText(product[field as keyof FoodProduct]);
      const currentNumber = NUMBER_FIELDS.has(field)
        ? fieldText(Number(current))
        : current;
      if (currentNumber === parsed.value || current === parsed.value) continue;
      rowChanges.push({
        id,
        name: product.name_ar,
        field,
        from: current,
        to: parsed.value,
      });
      fields[field] = parsed.stored;
    }

    // Brand: brand_id wins; else brand_name lookup / create
    const hasBrandIdCol = "brand_id" in row;
    const hasBrandNameCol = "brand_name" in row;
    if (hasBrandIdCol || hasBrandNameCol) {
      const rawId = (row.brand_id ?? "").trim();
      const rawName = (row.brand_name ?? "").trim();
      let nextBrandId: string | null = product.brand_id ?? null;
      let nextBrandLabel = brandNameById(brands, product.brand_id);

      if (rawId) {
        if (!brandIds.has(rawId)) {
          issues.push({
            row: line,
            message: `unbekannte brand_id: ${rawId}`,
          });
          return;
        }
        nextBrandId = rawId;
        nextBrandLabel = brandNameById(brands, rawId);
      } else if (rawName) {
        const existing = findBrandByName(brands, rawName);
        if (existing) {
          nextBrandId = existing.id;
          nextBrandLabel = existing.name;
        } else {
          // Will be created on apply
          nextBrandId = null;
          nextBrandLabel = rawName;
          createBrandName = rawName;
        }
      } else if (hasBrandIdCol && hasBrandNameCol && !rawId && !rawName) {
        // Explicit clear
        nextBrandId = null;
        nextBrandLabel = "";
      }

      const currentId = product.brand_id ?? "";
      const currentLabel = brandNameById(brands, product.brand_id);
      const nextIdValue = nextBrandId ?? "";
      if (currentId !== nextIdValue || (createBrandName && currentLabel !== createBrandName)) {
        rowChanges.push({
          id,
          name: product.name_ar,
          field: "brand",
          from: currentLabel || currentId || "—",
          to: nextBrandLabel || nextIdValue || "—",
        });
        if (!createBrandName) {
          fields.brand_id = nextBrandId;
        }
      }
    }

    changes.push(...rowChanges);
    if (Object.keys(fields).length || createBrandName) {
      updates.push({ id, fields, createBrandName });
    }
  });

  return { changes, issues, updates };
}

export function productAltText(nameDe: string, nameAr: string): string {
  const de = nameDe.trim();
  const ar = nameAr.trim();
  const primary = de || ar || "Produkt";
  return ar && de ? `${primary} (${ar}) – Produktfoto jmle` : `${primary} – Produktfoto jmle`;
}
