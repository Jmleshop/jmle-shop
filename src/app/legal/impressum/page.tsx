import LegalLayout from "@/components/LegalLayout";

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">
          Angaben gemäß § 5 TMG
        </h2>
        <p>
          jmle<br />
          Musterstraße 1<br />
          06869 Coswig (Anhalt)<br />
          Deutschland
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">Kontakt</h2>
        <p>
          Telefon: +49 (0) 123 456789<br />
          E-Mail: info@jmle.de
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Umsatzsteuer-ID
        </h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
          DE123456789
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
        </h2>
        <p>
          [Name des Verantwortlichen]<br />
          Musterstraße 1<br />
          06869 Coswig (Anhalt)
        </p>

        <p className="text-xs text-gray-400 pt-6">
          Bitte ersetzen Sie die Platzhalterdaten mit Ihren echten Unternehmensdaten,
          bevor Sie die Website veröffentlichen.
        </p>
      </section>
    </LegalLayout>
  );
}
