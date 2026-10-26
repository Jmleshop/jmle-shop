import { BUSINESS_INFO } from "@/lib/business-info";

/** Sichtbare Markierung für Angaben, die der Inhaber noch nachliefert. */
export function Missing({ what }: { what: string }) {
  return (
    <mark className="rounded bg-yellow-200 px-1 text-gray-900">[{what} — wird noch ergänzt]</mark>
  );
}

/** Anschrift aus BUSINESS_INFO, mehrzeilig; fehlt sie, erscheint ein Platzhalter. */
export function BusinessAddress() {
  const { streetAddress, postalCode, addressLocality } = BUSINESS_INFO;
  if (!streetAddress || !postalCode || !addressLocality) return <Missing what="Anschrift" />;
  return (
    <>
      {streetAddress}
      <br />
      {postalCode} {addressLocality}
    </>
  );
}

/** Anschrift einzeilig für Fließtext. */
export function BusinessAddressInline() {
  const { streetAddress, postalCode, addressLocality } = BUSINESS_INFO;
  if (!streetAddress || !postalCode || !addressLocality) return <Missing what="Anschrift" />;
  return <>{`${streetAddress}, ${postalCode} ${addressLocality}`}</>;
}
