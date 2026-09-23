import LegalLayout from "@/components/LegalLayout";

export default function WiderrufPage() {
  return (
    <LegalLayout title="Widerrufsbelehrung">
      <section className="space-y-4 text-sm leading-relaxed text-gray-700">
        <h2 className="text-lg font-medium text-luxury-black">
          Widerrufsrecht
        </h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen
          Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag,
          an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer
          ist, die Waren in Besitz genommen haben bzw. hat.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Ausübung des Widerrufsrechts
        </h2>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (jmle, Musterstraße 1,
          06869 Coswig (Anhalt), E-Mail: info@jmle.de) mittels einer eindeutigen
          Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren
          Entschluss, diesen Vertrag zu widerrufen, informieren.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Folgen des Widerrufs
        </h2>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die
          wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme
          der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art
          der Lieferung als die von uns angebotene, günstigste Standardlieferung
          gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem
          Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses
          Vertrags bei uns eingegangen ist.
        </p>

        <h2 className="text-lg font-medium text-luxury-black pt-4">
          Muster-Widerrufsformular
        </h2>
        <div className="bg-gray-50 p-4 border border-gray-200">
          <p>
            An jmle, Musterstraße 1, 06869 Coswig (Anhalt), E-Mail: info@jmle.de
          </p>
          <p className="mt-2">
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
            Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der
            folgenden Dienstleistung (*)
          </p>
          <p className="mt-2">Bestellt am (*)/erhalten am (*)</p>
          <p>Name des/der Verbraucher(s)</p>
          <p>Anschrift des/der Verbraucher(s)</p>
          <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
          <p>Datum</p>
          <p className="text-xs text-gray-400 mt-2">(*) Unzutreffendes streichen.</p>
        </div>

        <p className="text-xs text-gray-400 pt-6">
          Diese Widerrufsbelehrung ist eine Vorlage. Lassen Sie sie rechtlich prüfen.
        </p>
      </section>
    </LegalLayout>
  );
}
