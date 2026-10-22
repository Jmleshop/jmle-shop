import { formatEuroDe } from "@/lib/pricing";

/** Shop-WhatsApp, international ohne führende Null. */
export const WHATSAPP_E164 = "491749500391";
export const SHOP_PHONE_DISPLAY = "0174 9500391";

export function whatsAppOrderUrl(
  lines: { name: string; quantity: number; lineTotal: number }[],
  total: number,
  phone?: string,
  heading?: string,
  lang: "ar" | "de" = "ar"
): string {
  const ar = lang !== "de";
  const body = [
    heading || (ar ? "طلب جديد عبر jmle (عرض سعر)" : "Neue Anfrage über jmle (Preisvorschlag)"),
    phone ? `${ar ? "الهاتف" : "Telefon"}: ${phone}` : "",
    "",
    ...lines.map(
      (line) => `• ${line.quantity}× ${line.name} — ${formatEuroDe(line.lineTotal)}`
    ),
    "",
    `${ar ? "المجموع" : "Summe"}: ${formatEuroDe(total)}`,
    "",
    ar ? "تم تنزيل ملخص الطلب كملف PDF." : "Die Bestellübersicht wurde als PDF heruntergeladen.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(body)}`;
}
