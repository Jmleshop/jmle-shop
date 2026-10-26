import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { BusinessAddress } from "@/components/LegalBusiness";
import { BUSINESS_INFO } from "@/lib/business-info";

export const metadata: Metadata = { title: "Datenschutzerklärung (الخصوصية) | jmle" };

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
          {BUSINESS_INFO.legalName}
          <br />
          <BusinessAddress />
          <br />
          Telefon: {BUSINESS_INFO.telephoneDisplay}
          <br />
          E-Mail: {BUSINESS_INFO.email}
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
          Bei der Registrierung erheben wir folgende Daten: Name, Nachname, Straße
          und E-Mail-Adresse. Die Verarbeitung erfolgt über Supabase (Supabase Inc.,
          USA) auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          Es besteht ein Auftragsverarbeitungsvertrag (AVV) mit Supabase.
        </p>

        <h3 className="font-medium">Bestellanfragen und WhatsApp</h3>
        <p>
          Wenn Sie aus dem Warenkorb eine Anfrage senden, speichern wir Ihre Angaben (Name,
          Telefonnummer, Lieferadresse, optional E-Mail) und die gewünschten Artikel, um die
          Bestellung mit Ihnen abzustimmen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          Wählen Sie WhatsApp, öffnet sich WhatsApp (WhatsApp Ireland Limited) mit einer
          vorbereiteten Nachricht; was Sie dort senden, verarbeitet WhatsApp nach dessen
          eigener Datenschutzerklärung.
        </p>

        <h3 className="font-medium">Prüfung von Postleitzahl und Liefergebiet</h3>
        <p>
          Zur Vervollständigung der Postleitzahl und zur Prüfung, ob Ihr Ort in unserem
          Liefergebiet liegt, übermittelt unser Server die eingegebene Postleitzahl bzw. den
          Ortsnamen an OpenPLZ API (openplzapi.org) und an den Geocoding-Dienst Nominatim der
          OpenStreetMap Foundation. Die Abfrage erfolgt über unseren Server; Ihre IP-Adresse
          wird dabei nicht an diese Dienste weitergegeben. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. b DSGVO.
        </p>

        <h3 className="font-medium">Hosting</h3>
        <p>
          Die Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf verarbeitet Vercel
          technisch notwendige Daten wie IP-Adresse und Zeitpunkt des Zugriffs. Rechtsgrundlage
          ist Art. 6 Abs. 1 lit. f DSGVO (sicherer und stabiler Betrieb).
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          4. Ihre Rechte
        </h2>
        <p>Sie haben jederzeit das Recht auf:</p>
        <ul className="list-disc ps-6 space-y-1">
          <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>

        <p className="text-xs text-gray-600 pt-6">
          Diese Datenschutzerklärung ist eine Vorlage. Lassen Sie sie von einem
          Rechtsanwalt prüfen und an Ihre spezifischen Gegebenheiten anpassen.
        </p>
      </section>
    </LegalLayout>
  );
}
