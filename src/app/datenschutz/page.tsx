import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — jmle",
};

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">1. Überblick</h2>
        <p>
          Diese Hinweise beschreiben, welche personenbezogenen Daten beim Besuch von jmle
          verarbeitet werden. Personenbezogene Daten sind Angaben, mit denen Sie identifiziert
          werden können.
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">2. Verantwortliche Stelle</h2>
        <p>
          jmle
          <br />
          Musterstraße 1
          <br />
          06869 Coswig (Anhalt)
          <br />
          E-Mail: info@jmle.de
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">3. Cookies</h2>
        <p>
          Technisch notwendige Cookies speichern Ihre Sitzung, den Warenkorb und Ihre
          Cookie-Entscheidung. Sie sind für den Shop erforderlich (Art. 6 Abs. 1 lit. f DSGVO).
          Optionale Reichweitenmessung starten wir erst nach Ihrer Einwilligung (Art. 6 Abs. 1
          lit. a DSGVO). Die Einwilligung können Sie im Cookie-Hinweis widerrufen, indem Sie
          die gespeicherte Entscheidung in Ihrem Browser löschen.
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">4. Konto und Bestellung</h2>
        <p>
          Für Registrierung und Bestellung verarbeiten wir Name, Anschrift und E-Mail über
          Supabase. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Zahlungen laufen über Stripe
          Payments Europe, Ltd., ebenfalls zur Vertragserfüllung.
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">5. Ihre Rechte</h2>
        <ul className="list-disc space-y-1 pe-6">
          <li>Auskunft (Art. 15 DSGVO)</li>
          <li>Berichtigung (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch (Art. 21 DSGVO)</li>
          <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
        </ul>

        <p className="pt-6 text-xs text-gray-400">
          Vorlage. Vor der Veröffentlichung rechtlich prüfen und an den tatsächlichen Betrieb anpassen.
        </p>
      </section>
    </LegalLayout>
  );
}
