/**
 * Öffentliche Unternehmensdaten für LocalBusiness / Footer / Impressum.
 * Platzhalter — bitte mit echten Angaben ersetzen.
 */
export const BUSINESS_INFO = {
  legalName: "jmle",
  streetAddress: "Musterstraße 1",
  postalCode: "06869",
  addressLocality: "Coswig (Anhalt)",
  addressCountry: "DE",
  telephone: "+49-123-456789",
  email: "info@jmle.de",
  priceRange: "€€",
  /** Lat/Lng optional — weglassen wenn unbekannt */
  geo: null as null | { latitude: number; longitude: number },
  openingHours: ["Mo-Sa 09:00-18:00"],
  sameAs: [] as string[],
} as const;
