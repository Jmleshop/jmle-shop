import { formatEuroDe } from "@/lib/pricing";

/** Shop-WhatsApp, international ohne führende Null. */
export const WHATSAPP_E164 = "491749500391";
export const SHOP_PHONE_DISPLAY = "0174 9500391";

export type WhatsAppOrderExtras = {
  /** Weitere Kundenangaben, z. B. Name und Lieferadresse. */
  details?: string[];
  /** Anfrage-Nummer, nur wenn die Anfrage wirklich gespeichert wurde. */
  reference?: string;
  /** Nur true, wenn das PDF tatsächlich heruntergeladen wurde. */
  pdfDownloaded?: boolean;
};

export function whatsAppOrderUrl(
  lines: { name: string; quantity: number; lineTotal: number }[],
  total: number,
  phone?: string,
  heading?: string,
  lang: "ar" | "de" = "ar",
  extras: WhatsAppOrderExtras = {}
): string {
  const ar = lang !== "de";
  const body = [
    heading || (ar ? "طلب جديد عبر jmle (عرض سعر)" : "Neue Anfrage über jmle (Preisvorschlag)"),
    extras.reference ? `${ar ? "رقم الطلب" : "Anfrage-Nr."}: ${extras.reference}` : "",
    ...(extras.details ?? []),
    phone ? `${ar ? "الهاتف" : "Telefon"}: ${phone}` : "",
    "",
    ...lines.map(
      (line) => `• ${line.quantity}× ${line.name} — ${formatEuroDe(line.lineTotal)}`
    ),
    "",
    `${ar ? "المجموع" : "Summe"}: ${formatEuroDe(total)}`,
    "",
    extras.pdfDownloaded
      ? ar ? "تم تنزيل ملخص الطلب كملف PDF." : "Die Bestellübersicht wurde als PDF heruntergeladen."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(body)}`;
}
