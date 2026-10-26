import { SHOP_PHONE_DISPLAY } from "@/lib/whatsapp-order";

/**
 * Öffentliche Unternehmensdaten für Impressum, Datenschutz, Footer, PDFs und JSON-LD.
 * Felder mit `null` fehlen noch und werden auf der Seite sichtbar als Platzhalter
 * markiert (Anschrift und USt-IdNr. liefert der Inhaber nach, Stand 2026-10-26).
 */
export const BUSINESS_INFO = {
  legalName: "jmle",
  /** Verantwortliche Person (Impressum / § 18 MStV) */
  ownerName: null as string | null,
  streetAddress: null as string | null,
  postalCode: null as string | null,
  addressLocality: null as string | null,
  addressCountry: "DE",
  telephone: "+49-174-9500391",
  telephoneDisplay: SHOP_PHONE_DISPLAY,
  email: "info@jmle.de",
  /** USt-IdNr. — später als zentrale Admin-Einstellung */
  vatId: null as string | null,
  priceRange: "€€",
  /** Lat/Lng optional — weglassen wenn unbekannt */
  geo: null as null | { latitude: number; longitude: number },
  openingHours: ["Mo-Sa 09:00-18:00"],
  sameAs: [] as string[],
};

export function hasBusinessAddress(): boolean {
  return Boolean(
    BUSINESS_INFO.streetAddress && BUSINESS_INFO.postalCode && BUSINESS_INFO.addressLocality
  );
}

/** Einzeilige Anschrift, z. B. für PDFs; leer, solange sie fehlt. */
export function businessAddressLine(): string {
  if (!hasBusinessAddress()) return "";
  return `${BUSINESS_INFO.streetAddress}, ${BUSINESS_INFO.postalCode} ${BUSINESS_INFO.addressLocality}`;
}
