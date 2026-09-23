export function productPayload(body: Record<string, unknown>) {
  const images = Array.isArray(body.images)
    ? body.images.map(String).filter(Boolean)
    : [];
  const image = body.image ? String(body.image) : images[0] ?? null;
  const num = (v: unknown) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  let vat = Number(body.vat_rate ?? 19);
  if (Number.isNaN(vat)) vat = 19;
  vat = Math.min(100, Math.max(0, vat));

  const discount = Math.min(
    100,
    Math.max(0, Number(body.discount_percent ?? 0) || 0)
  );

  const status = body.status === "draft" ? "draft" : "published";

  return {
    name_ar: String(body.name_ar ?? "").trim(),
    name_de: String(body.name_de ?? "").trim() || "",
    description: String(body.description ?? "") || "",
    price: Number(body.price),
    currency: String(body.currency ?? "EUR") || "EUR",
    category_id: body.category_id || null,
    image,
    images,
    ingredients: String(body.ingredients ?? "") || "",
    allergens: String(body.allergens ?? "") || "",
    origin_country: String(body.origin_country ?? "") || "",
    weight_value: num(body.weight_value),
    weight_unit: String(body.weight_unit ?? "g") || "g",
    gross_weight_value: num(body.gross_weight_value),
    gross_weight_unit: String(body.gross_weight_unit ?? "g") || "g",
    best_before_note: String(body.best_before_note ?? "") || "",
    vat_rate: vat,
    purchase_price: num(body.purchase_price),
    discount_percent: discount,
    barcode: body.barcode ? String(body.barcode) : null,
    product_number: body.product_number ? String(body.product_number) : null,
    max_order_quantity: Math.max(1, Number(body.max_order_quantity ?? 10) || 10),
    stock_quantity: Math.max(0, Number(body.stock_quantity ?? 0) || 0),
    status,
  };
}

export function validateProductPayload(payload: ReturnType<typeof productPayload>) {
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
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, gross_weight_value, gross_weight_unit, best_before_note, vat_rate, purchase_price, discount_percent, barcode, product_number, max_order_quantity, stock_quantity, status, deleted_at, created_at, updated_at, category:categories(id, name_ar, name_de)";
