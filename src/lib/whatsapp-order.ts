import { formatEuroDe } from "@/lib/pricing";

/** Platzhalter aus dem Impressum, international ohne führende Null. */
export const WHATSAPP_E164 = "49123456789";

export function whatsAppOrderUrl(
  lines: { name: string; quantity: number; lineTotal: number }[],
  total: number,
  phone?: string
): string {
  const body = [
    "Neue Anfrage über jmle (Preisvorschlag)",
    phone ? `Telefon: ${phone}` : "",
    "",
    ...lines.map(
      (line) => `• ${line.quantity}× ${line.name} — ${formatEuroDe(line.lineTotal)}`
    ),
    "",
    `Summe: ${formatEuroDe(total)}`,
    "",
    "Die Bestellübersicht wurde als PDF heruntergeladen.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(body)}`;
}
