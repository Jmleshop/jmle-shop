"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { whatsAppOrderUrl } from "@/lib/whatsapp-order";
import { downloadQuotePdf } from "@/components/cart/QuotePdf";
import type { InquiryLine } from "@/lib/inquiry";

type Place = { postalCode: string; name: string };

export default function CartRequestPanel({
  lines,
  totalLabel,
}: {
  lines: InquiryLine[];
  totalLabel: string;
}) {
  const [phone, setPhone] = useState("");
  const [agb, setAgb] = useState(false);
  const [contactOk, setContactOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    const code = postalCode.trim();
    if (code.length < 3) {
      setPlaces([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`https://openplzapi.org/de/Localities?postalCode=${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: Array<{ postalCode?: string; name?: string }>) => {
          const seen = new Set<string>();
          const next: Place[] = [];
          for (const row of rows ?? []) {
            const label = `${row.postalCode ?? ""} ${row.name ?? ""}`.trim();
            if (!label || seen.has(label)) continue;
            seen.add(label);
            next.push({ postalCode: row.postalCode ?? code, name: row.name ?? "" });
          }
          setPlaces(next.slice(0, 8));
        })
        .catch(() => setPlaces([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [postalCode]);

  const whatsAppReady = agb && contactOk && phone.trim().length >= 6 && lines.length > 0;

  async function send(channel: "whatsapp" | "callback") {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: phone.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim(),
          street: street.trim(),
          postalCode: postalCode.trim(),
          city: city.trim(),
          items: lines,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Anfrage konnte nicht gespeichert werden.");

      if (channel === "whatsapp") {
        await downloadQuotePdf({
          protocol: String(payload.id).slice(0, 8),
          phone: phone.trim(),
          lines,
          kind: "quote",
        });
        window.open(
          whatsAppOrderUrl(
            lines.map((line) => ({
              name: line.name,
              quantity: line.quantity,
              lineTotal: line.unitPrice * line.quantity,
            })),
            lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
            phone.trim()
          ),
          "_blank",
          "noopener,noreferrer"
        );
      }
      setThanks(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-amber-200/70 bg-white p-4 md:p-5">
      <h2 className="font-ui text-lg font-semibold text-luxury-ink">Anfrage statt Direktkauf</h2>
      <p className="text-sm text-luxury-charcoal/70">Summe {totalLabel}. Es wird nichts online abgebucht.</p>

      <div className="space-y-3 rounded-2xl bg-jmle-warm/50 p-4">
        <p className="font-ui text-sm font-semibold">Direkt per WhatsApp bestellen</p>
        <label className="block text-sm">
          Telefonnummer
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-amber-200 px-3"
            inputMode="tel"
            required
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agb} onChange={(e) => setAgb(e.target.checked)} className="mt-1" />
          <span>
            Ich akzeptiere die <Link href="/agb" className="underline">AGB</Link> und die{" "}
            <Link href="/datenschutz" className="underline">Datenschutzbedingungen</Link>.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} className="mt-1" />
          <span>Ich bin einverstanden, per Telefon oder WhatsApp kontaktiert zu werden.</span>
        </label>
        <button
          type="button"
          disabled={!whatsAppReady || busy}
          onClick={() => void send("whatsapp")}
          className="min-h-12 w-full rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          Direkt per WhatsApp bestellen
        </button>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send("callback");
        }}
      >
        <p className="font-ui text-sm font-semibold">Kontaktdaten eingeben und Angebot anfordern</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
          <input required placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
        </div>
        <input required placeholder="Telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 px-3" />
        <input placeholder="E-Mail (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 px-3" />
        <input placeholder="Straße und Hausnummer (optional)" value={street} onChange={(e) => setStreet(e.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 px-3" />
        <div className="relative grid gap-3 sm:grid-cols-2">
          <input
            placeholder="PLZ"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="min-h-11 rounded-xl border border-amber-200 px-3"
            inputMode="numeric"
          />
          <input placeholder="Ort" value={city} onChange={(e) => setCity(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
          {places.length > 0 && (
            <ul className="absolute z-20 top-12 inset-x-0 max-h-48 overflow-auto rounded-xl border border-amber-200 bg-white shadow-boutique">
              {places.map((place) => (
                <li key={`${place.postalCode}-${place.name}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-start text-sm hover:bg-jmle-warm"
                    onClick={() => {
                      setPostalCode(place.postalCode);
                      setCity(place.name);
                      setPlaces([]);
                    }}
                  >
                    {place.postalCode} {place.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" disabled={busy || phone.trim().length < 6} className="min-h-12 w-full rounded-xl bg-brand-orange text-sm font-semibold text-white disabled:opacity-40">
          Angebot anfordern
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {thanks && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-boutique" role="dialog">
            <p className="font-ui text-lg font-semibold">Vielen Dank für Ihre Anfrage!</p>
            <p className="mt-2 text-sm text-luxury-charcoal/80">Wir melden uns in Kürze bei Ihnen.</p>
            <button type="button" className="mt-4 min-h-11 rounded-xl bg-brand-orange px-5 text-white" onClick={() => setThanks(false)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
