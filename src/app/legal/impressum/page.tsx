import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { BusinessAddress, Missing } from "@/components/LegalBusiness";
import { BUSINESS_INFO } from "@/lib/business-info";

export const metadata: Metadata = { title: "Impressum (بيانات الناشر) | jmle" };

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">
          Angaben gemäß § 5 DDG
        </h2>
        <p>
          {BUSINESS_INFO.legalName}
          <br />
          {BUSINESS_INFO.ownerName ?? <Missing what="Name des Inhabers" />}
          <br />
          <BusinessAddress />
          <br />
          Deutschland
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">Kontakt</h2>
        <p>
          Telefon: {BUSINESS_INFO.telephoneDisplay}
          <br />
          E-Mail: {BUSINESS_INFO.email}
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Umsatzsteuer-ID
        </h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
          <br />
          {BUSINESS_INFO.vatId ?? <Missing what="USt-IdNr." />}
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p>
          {BUSINESS_INFO.ownerName ?? <Missing what="Name des Verantwortlichen" />}
          <br />
          <BusinessAddress />
        </p>

        <p className="text-xs text-gray-600 pt-6">
          Entwurf: Die gelb markierten Angaben werden noch ergänzt. Der Text wird vor dem
          endgültigen Einsatz rechtlich geprüft.
        </p>
      </section>
    </LegalLayout>
  );
}
