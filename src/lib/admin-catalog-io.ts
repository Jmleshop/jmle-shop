import type { FoodProduct } from "@/types";

const HEADERS = [
  "name_ar",
  "name_de",
  "price",
  "vat_rate",
  "stock_quantity",
  "barcode",
  "product_number",
  "category_id",
  "weight_value",
  "weight_unit",
] as const;

function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function productsToCsv(products: FoodProduct[]): string {
  const lines = [HEADERS.join(",")];
  for (const product of products) {
    lines.push(HEADERS.map((key) => cell(product[key])).join(","));
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
  return rows.slice(1).filter((cells) => cells.some(Boolean)).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });
    return record;
  });
}

export function productAltText(nameDe: string, nameAr: string): string {
  const de = nameDe.trim();
  const ar = nameAr.trim();
  const primary = de || ar || "Produkt";
  return ar && de ? `${primary} (${ar}) – Produktfoto jmle` : `${primary} – Produktfoto jmle`;
}
