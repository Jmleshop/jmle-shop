import { productCreateSchema } from "@/lib/validations/product";
import type { ProductCreateInput } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/validations";

/** @deprecated Prefer parseProductBody — kept for gradual migration */
export function productPayload(body: Record<string, unknown>): ProductCreateInput {
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    // Best-effort fallback for legacy callers — API routes should use parseProductBody
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Produktdaten");
  }
  return parsed.data;
}

export function parseProductBody(body: unknown) {
  return parseJsonBody(productCreateSchema, body);
}

export function validateProductPayload(payload: ProductCreateInput): string | null {
  if (!payload.name_ar) return "Arabischer Name ist Pflicht";
  if (payload.price == null || Number.isNaN(payload.price)) return "Preis ist Pflicht";
  if (payload.vat_rate == null || Number.isNaN(payload.vat_rate)) {
    return "MwSt.-Satz ist Pflicht";
  }
  if (!payload.category_id) return "Kategorie ist Pflicht";
  return null;
}

export const PRODUCT_SELECT_BASE =
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, gross_weight_value, gross_weight_unit, best_before_note, vat_rate, purchase_price, discount_percent, barcode, product_number, max_order_quantity, stock_quantity, deleted_at, created_at, updated_at, category:categories(id, name_ar, name_de)";

export const PRODUCT_SELECT =
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, gross_weight_value, gross_weight_unit, best_before_note, vat_rate, purchase_price, discount_percent, barcode, product_number, max_order_quantity, stock_quantity, status, badges, custom_note, deleted_at, created_at, updated_at, category:categories(id, name_ar, name_de)";
