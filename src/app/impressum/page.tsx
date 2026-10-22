import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Impressum — jmle",
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">Angaben gemäß § 5 DDG</h2>
        <p>
          jmle
          <br />
          Musterstraße 1
          <br />
          06869 Coswig (Anhalt)
          <br />
          Deutschland
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">Kontakt</h2>
        <p>
          Telefon: 0174 9500391
          <br />
          E-Mail: info@jmle.de
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
          <br />
          DE123456789
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p>
          [Name des Verantwortlichen]
          <br />
          Musterstraße 1
          <br />
          06869 Coswig (Anhalt)
        </p>

        <p className="pt-6 text-xs text-gray-400">
          Platzhalterdaten. Vor der Veröffentlichung durch die echten Unternehmensangaben ersetzen.
        </p>
      </section>
    </LegalLayout>
  );
}
