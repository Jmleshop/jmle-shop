import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "AGB und Widerruf — jmle",
};

export default function AgbPage() {
  return (
    <LegalLayout title="Widerrufsbelehrung und AGB">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">Widerrufsrecht</h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen. Die Frist beginnt an dem Tag, an dem Sie oder ein von Ihnen benannter
          Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben.
        </p>
        <p>
          Der Widerruf ist zu richten an: jmle, Musterstraße 1, 06869 Coswig (Anhalt),
          E-Mail: info@jmle.de. Wir erstatten alle Zahlungen einschließlich der günstigsten
          Standardlieferung spätestens binnen vierzehn Tagen nach Eingang des Widerrufs.
        </p>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">Muster-Widerrufsformular</h2>
        <div className="border border-amber-200/70 bg-jmle-warm/40 p-4">
          <p>An jmle, Musterstraße 1, 06869 Coswig (Anhalt), info@jmle.de</p>
          <p className="mt-2">
            Hiermit widerrufe(n) ich/wir den Vertrag über den Kauf der folgenden Waren.
          </p>
          <p className="mt-2">Bestellt am / erhalten am</p>
          <p>Name und Anschrift</p>
          <p>Datum und Unterschrift (nur auf Papier)</p>
        </div>

        <h2 className="pt-4 text-lg font-medium text-luxury-black">AGB</h2>
        <h3 className="font-medium">Geltung</h3>
        <p>
          Diese Bedingungen gelten für Bestellungen im Online-Shop jmle durch Verbraucher mit
          Wohnsitz in der Europäischen Union. Vertragspartner ist jmle, Coswig (Anhalt).
        </p>
        <h3 className="font-medium">Vertragsschluss</h3>
        <p>
          Die Darstellung der Produkte ist kein bindendes Angebot. Mit der Bestellung geben Sie
          ein Angebot ab. Der Vertrag kommt zustande, wenn wir die Bestellung per E-Mail annehmen
          oder die Ware versenden.
        </p>
        <h3 className="font-medium">Preise und Zahlung</h3>
        <p>
          Preise verstehen sich in Euro inklusive der gesetzlichen Mehrwertsteuer zuzüglich der
          im Checkout genannten Versandkosten. Die Zahlung erfolgt über die angebotenen
          Zahlungsarten.
        </p>
        <h3 className="font-medium">Lieferung</h3>
        <p>
          Die Lieferung erfolgt an die von Ihnen angegebene Adresse innerhalb Deutschlands, soweit
          im Shop nichts anderes steht. Lebensmittel sind von der Rücksendung ausgenommen, soweit
          das Widerrufsrecht nach § 312g Abs. 2 BGB ausgeschlossen ist (etwa schnell verderbliche
          Ware oder versiegelte Ware, die aus Gründen des Gesundheitsschutzes nicht zur Rückgabe
          geeignet ist, wenn die Versiegelung entfernt wurde).
        </p>

        <p className="pt-6 text-xs text-gray-400">
          Vorlage. Vor der Veröffentlichung rechtlich prüfen und an Sortiment und Versand anpassen.
        </p>
      </section>
    </LegalLayout>
  );
}
