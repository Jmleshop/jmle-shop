import LegalLayout from "@/components/LegalLayout";

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">
          1. Datenschutz auf einen Blick
        </h2>
        <h3 className="font-medium">Allgemeine Hinweise</h3>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
          Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
          Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
          identifiziert werden können.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          2. Verantwortliche Stelle
        </h2>
        <p>
          jmle<br />
          Musterstraße 1<br />
          06869 Coswig (Anhalt)<br />
          E-Mail: info@jmle.de
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          3. Datenerfassung auf dieser Website
        </h2>
        <h3 className="font-medium">Cookies</h3>
        <p>
          Unsere Website verwendet Cookies. Das sind kleine Textdateien, die Ihr
          Webbrowser auf Ihrem Endgerät speichert. Cookies helfen uns dabei, unser
          Angebot nutzerfreundlicher, effektiver und sicherer zu machen.
        </p>

        <h3 className="font-medium">Registrierung und Authentifizierung</h3>
        <p>
          Bei der Registierung erheben wir folgende Daten: Name, Nachname, Straße
          und E-Mail-Adresse. Die Verarbeitung erfolgt über Supabase (Supabase Inc.,
          USA) auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          Es besteht ein Auftragsverarbeitungsvertrag (AVV) mit Supabase.
        </p>

        <h3 className="font-medium">Zahlungsabwicklung</h3>
        <p>
          Für Zahlungen nutzen wir Stripe (Stripe Payments Europe, Ltd.). Stripe
          verarbeitet Zahlungsdaten gemäß deren Datenschutzerklärung. Rechtsgrundlage
          ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          4. Ihre Rechte
        </h2>
        <p>Sie haben jederzeit das Recht auf:</p>
        <ul className="list-disc pr-6 space-y-1">
          <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>

        <p className="text-xs text-gray-400 pt-6">
          Diese Datenschutzerklärung ist eine Vorlage. Lassen Sie sie von einem
          Rechtsanwalt prüfen und an Ihre spezifischen Gegebenheiten anpassen.
        </p>
      </section>
    </LegalLayout>
  );
}
