import { z } from "zod";
import { normalizeBadges } from "@/lib/product-badges";

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function asNullableNumber(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asWeightUnit(v: unknown): string {
  const u = asString(v, "g").toLowerCase();
  if (["g", "kg", "ml", "l", "stück", "stk", "pcs"].includes(u)) return u;
  return "g";
}

function asNullableString(v: unknown): string | null {
  const s = asString(v);
  return s.length ? s : null;
}

export const productCreateSchema = z
  .object({
    name_ar: z.unknown(),
    name_de: z.unknown().optional(),
    description: z.unknown().optional(),
    price: z.unknown(),
    currency: z.unknown().optional(),
    category_id: z.unknown().optional(),
    image: z.unknown().optional(),
    images: z.unknown().optional(),
    ingredients: z.unknown().optional(),
    allergens: z.unknown().optional(),
    origin_country: z.unknown().optional(),
    weight_value: z.unknown().optional(),
    weight_unit: z.unknown().optional(),
    gross_weight_value: z.unknown().optional(),
    gross_weight_unit: z.unknown().optional(),
    best_before_note: z.unknown().optional(),
    vat_rate: z.unknown().optional(),
    purchase_price: z.unknown().optional(),
    discount_percent: z.unknown().optional(),
    barcode: z.unknown().optional(),
    product_number: z.unknown().optional(),
    max_order_quantity: z.unknown().optional(),
    stock_quantity: z.unknown().optional(),
    status: z.unknown().optional(),
    badges: z.unknown().optional(),
    custom_note: z.unknown().optional(),
  })
  .transform((raw, ctx) => {
    const name_ar = asString(raw.name_ar);
    if (!name_ar) {
      ctx.addIssue({ code: "custom", message: "Arabischer Name ist Pflicht", path: ["name_ar"] });
    }

    const price = asNullableNumber(raw.price);
    if (price == null || price <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Preis muss > 0 sein",
        path: ["price"],
      });
    }

    const category_id = asNullableString(raw.category_id);
    if (!category_id) {
      ctx.addIssue({ code: "custom", message: "Kategorie ist Pflicht", path: ["category_id"] });
    }

    let vat_rate = asNullableNumber(raw.vat_rate);
    if (vat_rate == null) vat_rate = 19;
    vat_rate = Math.min(100, Math.max(0, vat_rate));

    let discount_percent = asNullableNumber(raw.discount_percent) ?? 0;
    discount_percent = Math.min(100, Math.max(0, discount_percent));

    const images = Array.isArray(raw.images)
      ? raw.images.map(String).map((s) => s.trim()).filter(Boolean)
      : [];
    const image = asNullableString(raw.image) ?? images[0] ?? null;

    // null / "" / "unlimited" / "open" = dynamisch an Lager gekoppelt
    const maxRaw = raw.max_order_quantity;
    let max_order_quantity: number | null = null;
    if (
      maxRaw !== null &&
      maxRaw !== undefined &&
      maxRaw !== "" &&
      String(maxRaw).toLowerCase() !== "unlimited" &&
      String(maxRaw).toLowerCase() !== "open"
    ) {
      const n = asNullableNumber(maxRaw);
      if (n != null && n > 0) {
        max_order_quantity = Math.max(1, Math.min(999, Math.floor(n)));
      }
    }

    let stock_quantity = asNullableNumber(raw.stock_quantity) ?? 0;
    stock_quantity = Math.max(0, Math.min(1_000_000, Math.floor(stock_quantity)));

    const status = asString(raw.status) === "draft" ? "draft" : "published";
    const currency = (asString(raw.currency, "EUR") || "EUR").toUpperCase().slice(0, 3);

    return {
      name_ar,
      name_de: asString(raw.name_de),
      description: asString(raw.description),
      price: price ?? 0,
      currency,
      category_id,
      image,
      images,
      ingredients: asString(raw.ingredients),
      allergens: asString(raw.allergens),
      origin_country: asString(raw.origin_country),
      weight_value: asNullableNumber(raw.weight_value),
      weight_unit: asWeightUnit(raw.weight_unit),
      gross_weight_value: asNullableNumber(raw.gross_weight_value),
      gross_weight_unit: asWeightUnit(raw.gross_weight_unit),
      best_before_note: asString(raw.best_before_note),
      vat_rate,
      purchase_price: asNullableNumber(raw.purchase_price),
      discount_percent,
      barcode: asNullableString(raw.barcode),
      product_number: asNullableString(raw.product_number),
      max_order_quantity,
      stock_quantity,
      status: status as "draft" | "published",
      badges: normalizeBadges(raw.badges),
      custom_note: asString(raw.custom_note).slice(0, 200),
    };
  })
  .superRefine((data, ctx) => {
    if (!data.name_ar) {
      ctx.addIssue({ code: "custom", message: "Arabischer Name ist Pflicht", path: ["name_ar"] });
    }
    if (!data.price || data.price <= 0) {
      ctx.addIssue({ code: "custom", message: "Preis muss > 0 sein", path: ["price"] });
    }
    if (!data.category_id) {
      ctx.addIssue({ code: "custom", message: "Kategorie ist Pflicht", path: ["category_id"] });
    }
  });

export const productArchiveSchema = z.object({
  archived: z.boolean(),
});

export const categoryCreateSchema = z
  .object({
    id: z.unknown().optional(),
    name_ar: z.unknown(),
    name_de: z.unknown().optional(),
    image: z.unknown().optional(),
    sort_order: z.unknown().optional(),
    parent_id: z.unknown().optional(),
  })
  .transform((raw, ctx) => {
    const name_ar = asString(raw.name_ar);
    if (!name_ar) {
      ctx.addIssue({ code: "custom", message: "Arabischer Name ist Pflicht", path: ["name_ar"] });
    }
    const sort = asNullableNumber(raw.sort_order) ?? 0;
    return {
      id: asNullableString(raw.id) ?? undefined,
      name_ar,
      name_de: asString(raw.name_de),
      image: asNullableString(raw.image),
      sort_order: Math.max(0, Math.floor(sort)),
      parent_id: asNullableString(raw.parent_id),
    };
  })
  .superRefine((data, ctx) => {
    if (!data.name_ar) {
      ctx.addIssue({ code: "custom", message: "Arabischer Name ist Pflicht", path: ["name_ar"] });
    }
  });

export const categoryUpdateSchema = categoryCreateSchema;

export const categoryReorderSchema = z.object({
  order: z
    .array(
      z.object({
        id: z.string().min(1),
        sort_order: z.coerce.number().int().min(0),
        parent_id: z
          .union([z.string(), z.null(), z.undefined()])
          .optional()
          .transform((v) =>
            v == null || String(v).trim() === "" ? null : String(v).trim()
          ),
      })
    )
    .min(1)
    .max(500),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
