import { formatEuroDe } from "@/lib/pricing";

/** Platzhalter aus dem Impressum, international ohne führende Null. */
export const WHATSAPP_E164 = "49123456789";

export function whatsAppOrderUrl(
  lines: { name: string; quantity: number; lineTotal: number }[],
  total: number
): string {
  const body = [
    "Neue Bestellung über jmle",
    "",
    ...lines.map(
      (line) => `• ${line.quantity}× ${line.name} — ${formatEuroDe(line.lineTotal)}`
    ),
    "",
    `Summe: ${formatEuroDe(total)}`,
  ].join("\n");
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(body)}`;
}
