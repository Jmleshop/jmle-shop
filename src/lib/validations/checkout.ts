import { z } from "zod";

const uuidLike = z
  .string()
  .trim()
  .min(1, "Produkt-ID fehlt")
  .max(80, "Produkt-ID ungültig");

export const checkoutItemSchema = z.object({
  productId: uuidLike,
  quantity: z
    .number({ error: "Menge muss eine Zahl sein" })
    .int("Menge muss ganzzahlig sein")
    .min(1, "Menge mindestens 1")
    .max(99, "Menge maximal 99"),
});

export const checkoutSchema = z.object({
  items: z
    .array(checkoutItemSchema)
    .min(1, "Warenkorb ist leer")
    .max(50, "Zu viele Positionen"),
  discountCode: z
    .unknown()
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      const s = String(v).trim();
      if (!s) return undefined;
      if (s.length > 40) return undefined;
      if (!/^[A-Za-z0-9_-]+$/.test(s)) return undefined;
      return s;
    }),
  customerEmail: z
    .string()
    .trim()
    .email("Ungültige E-Mail")
    .max(254)
    .optional(),
  shippingAddress: z
    .object({
      name: z.string().trim().min(1).max(120),
      street: z.string().trim().min(1).max(200),
      postalCode: z
        .string()
        .trim()
        .regex(/^\d{5}$/, "PLZ muss 5 Ziffern sein"),
      city: z.string().trim().min(1).max(100),
      country: z
        .string()
        .trim()
        .length(2, "Ländercode ISO-2")
        .default("DE"),
    })
    .optional(),
});

export const discountCodeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code zu kurz")
    .max(40, "Code zu lang")
    .regex(/^[A-Za-z0-9_-]+$/, "Nur Buchstaben, Zahlen, _ und -"),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive("Wert muss > 0 sein").max(100000),
  usage_limit: z.number().int().positive().nullable().optional(),
  expires_at: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null || String(v).trim() === "") return null;
      const s = String(v).trim();
      // Akzeptiert ISO-Datetime oder YYYY-MM-DD
      const d = new Date(s.length === 10 ? `${s}T23:59:59.000Z` : s);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    }),
  active: z.boolean().optional().default(true),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DiscountCodeCreateInput = z.infer<typeof discountCodeCreateSchema>;
