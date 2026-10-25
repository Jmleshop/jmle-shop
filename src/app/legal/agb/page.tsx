import LegalLayout from "@/components/LegalLayout";

export default function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">Geltung</h2>
        <p>
          Diese Bedingungen gelten für Bestellungen im Online-Shop jmle durch Verbraucher mit
          Wohnsitz in der Europäischen Union. Vertragspartner ist jmle, Coswig (Anhalt).
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">Vertragsschluss</h2>
        <p>
          Die Darstellung der Produkte ist kein bindendes Angebot. Mit der Bestellung geben Sie
          ein Angebot ab. Der Vertrag kommt zustande, wenn wir die Bestellung per E-Mail annehmen
          oder die Ware versenden.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">Preise und Zahlung</h2>
        <p>
          Preise verstehen sich in Euro inklusive der gesetzlichen Mehrwertsteuer zuzüglich der
          im Checkout genannten Versandkosten. Die Zahlung erfolgt über die angebotenen
          Zahlungsarten.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">Lieferung</h2>
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
