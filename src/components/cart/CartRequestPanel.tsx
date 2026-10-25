"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useShopLocale } from "@/components/ShopLocale";
import { whatsAppOrderUrl } from "@/lib/whatsapp-order";
import { downloadQuotePdf } from "@/components/cart/QuotePdf";
import type { InquiryLine } from "@/lib/inquiry";

type CartTotals = { discount: number; shipping: number; grandTotal: number };

type Place = { postalCode: string; name: string };

/** Ergebnis einer Anfrage: "saved" = beim Shop gespeichert; "whatsapp" = nur vorbereitet, Kunde muss in WhatsApp senden. */
type RequestResult = { kind: "saved" | "whatsapp"; reference?: string; whatsappUrl?: string };

/** Fenster direkt im Klick öffnen, sonst blockieren mobile Browser es nach den await-Schritten als Popup. */
function openPendingWindow(): Window | null {
  const win = window.open("", "_blank");
  if (win) win.opener = null;
  return win;
}

function goToWhatsApp(win: Window | null, url: string) {
  if (win && !win.closed) win.location.href = url;
  else window.location.href = url;
}

/** Speichert die Anfrage; liefert die Kurz-Nr. oder null, wenn das Speichern scheitert. */
async function saveInquiry(body: Record<string, unknown>): Promise<{ reference: string | null; error?: string }> {
  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id) return { reference: null, error: payload.error || "Anfrage konnte nicht gespeichert werden." };
    return { reference: String(payload.id).slice(0, 8) };
  } catch {
    return { reference: null, error: "Anfrage konnte nicht gespeichert werden." };
  }
}

export default function CartRequestPanel({
  lines,
  totalLabel,
  totals,
}: {
  lines: InquiryLine[];
  totalLabel: string;
  totals?: CartTotals;
}) {
  const { lang, t } = useShopLocale();
  const [phone, setPhone] = useState("");
  const [agb, setAgb] = useState(false);
  const [contactOk, setContactOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RequestResult | null>(null);
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
    const pending = channel === "whatsapp" ? openPendingWindow() : null;
    try {
      const saved = await saveInquiry({
        channel,
        phone: phone.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        street: street.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        items: lines,
      });

      if (channel === "callback") {
        // Rückruf geht nur über die gespeicherte Anfrage — ohne Speichern kein Erfolg melden.
        if (!saved.reference) {
          setError(saved.error || "Anfrage fehlgeschlagen.");
          return;
        }
        setResult({ kind: "saved", reference: saved.reference });
        return;
      }

      // WhatsApp: Die Nachricht selbst ist die Bestellung, daher auch ohne gespeicherte Anfrage öffnen.
      const reference = saved.reference ?? undefined;
      let pdfDownloaded = false;
      try {
        await downloadQuotePdf({ protocol: reference ?? "—", phone: phone.trim(), lines, kind: "quote", lang });
        pdfDownloaded = true;
      } catch {
        // PDF ist nur eine Beigabe; WhatsApp trotzdem öffnen.
      }
      const url = whatsAppOrderUrl(
        lines.map((line) => ({ name: line.name, quantity: line.quantity, lineTotal: line.unitPrice * line.quantity })),
        lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
        phone.trim(),
        undefined,
        lang,
        { reference, pdfDownloaded, totals }
      );
      goToWhatsApp(pending, url);
      setResult({ kind: "whatsapp", reference, whatsappUrl: url });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-amber-200/70 bg-white p-4 md:p-5">
      <h2 className="font-ui text-lg font-semibold text-luxury-ink">{lang === "ar" ? "طلب بدون دفع مباشر" : "Anfrage statt Direktkauf"}</h2>
      <p className="text-sm text-luxury-charcoal/70">{lang === "ar" ? `المجموع ${totalLabel}. لا يتم خصم أي مبلغ عبر الإنترنت.` : `Summe ${totalLabel}. Es wird nichts online abgebucht.`}</p>

      <div className="space-y-3 rounded-2xl bg-jmle-warm/50 p-4">
        <p className="font-ui text-sm font-semibold">{t("whatsapp")}</p>
        <label className="block text-sm">
          {t("phone")}
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
            {t("acceptLegal")} <Link href="/legal/agb" className="underline">AGB</Link> · <Link href="/legal/datenschutz" className="underline">{lang === "ar" ? "الخصوصية" : "Datenschutz"}</Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} className="mt-1" />
          <span>{t("acceptContact")}</span>
        </label>
        <button
          type="button"
          disabled={!whatsAppReady || busy}
          onClick={() => void send("whatsapp")}
          className="min-h-12 w-full rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("whatsapp")}
        </button>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send("callback");
        }}
      >
        <p className="font-ui text-sm font-semibold">{t("offerTitle")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder={t("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
          <input required placeholder={t("lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
        </div>
        <input required placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 px-3" />
        <input placeholder={lang === "ar" ? "البريد الإلكتروني (اختياري)" : "E-Mail (optional)"} value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 px-3" />
        <input placeholder={lang === "ar" ? "الشارع ورقم المنزل (اختياري)" : "Straße und Hausnummer (optional)"} value={street} onChange={(e) => setStreet(e.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 px-3" />
        <div className="relative grid gap-3 sm:grid-cols-2">
          <input
            placeholder={lang === "ar" ? "الرمز البريدي" : "PLZ"}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="min-h-11 rounded-xl border border-amber-200 px-3"
            inputMode="numeric"
          />
          <input placeholder={lang === "ar" ? "المدينة" : "Ort"} value={city} onChange={(e) => setCity(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
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
          {t("requestOffer")}
        </button>
      </form>
      <HomeDelivery lines={lines} totals={totals} busy={busy} onDone={setResult} onError={setError} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-boutique" role="dialog">
            <p className="font-ui text-lg font-semibold">
              {result.kind === "saved" ? t("requestThanksTitle") : t("whatsappOpenedTitle")}
            </p>
            <p className="mt-2 text-sm text-luxury-charcoal/80">
              {result.kind === "saved" ? t("requestThanksBody") : t("whatsappOpenedBody")}
            </p>
            {result.reference && (
              <p className="mt-2 text-xs text-luxury-charcoal/70">{t("requestReference", { ref: result.reference })}</p>
            )}
            {result.whatsappUrl && (
              <a
                href={result.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white"
              >
                {t("whatsappOpenAgain")}
              </a>
            )}
            <button type="button" className="mt-3 min-h-11 rounded-xl bg-brand-orange px-5 text-white" onClick={() => setResult(null)}>
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type AreaStatus = "idle" | "not_found" | "outside" | "ok";

function HomeDelivery({
  lines,
  totals,
  busy,
  onDone,
  onError,
}: {
  lines: InquiryLine[];
  totals?: CartTotals;
  busy: boolean;
  onDone: (result: RequestResult) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AreaStatus>("idle");
  const [place, setPlace] = useState({ postalCode: "", city: "" });
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [agb, setAgb] = useState(false);
  const [sending, setSending] = useState(false);
  const { lang, t } = useShopLocale();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setStatus("idle");
      setPlace({ postalCode: "", city: "" });
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/delivery-check?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { status?: AreaStatus; postalCode?: string; city?: string }) => {
          const next = data.status === "ok" || data.status === "outside" || data.status === "not_found" ? data.status : "not_found";
          setStatus(next);
          setPlace({ postalCode: data.postalCode ?? "", city: data.city ?? "" });
        })
        .catch(() => {
          setStatus("not_found");
          setPlace({ postalCode: "", city: "" });
        });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [query]);

  const unlocked = status === "ok";
  const canSend = unlocked && agb && street.trim() && house.trim() && firstName.trim() && lastName.trim() && phone.trim().length >= 6;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSend || busy || sending) return;
    setSending(true);
    onError("");
    const pending = openPendingWindow();
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`;
      const address = `${street.trim()} ${house.trim()}, ${place.postalCode} ${place.city}`;
      const saved = await saveInquiry({
        channel: "delivery",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        street: `${street.trim()} ${house.trim()}`,
        postalCode: place.postalCode,
        city: place.city,
        items: lines,
      });
      const reference = saved.reference ?? undefined;
      let pdfDownloaded = false;
      try {
        await downloadQuotePdf({
          protocol: reference ?? "—",
          phone: phone.trim(),
          lines,
          kind: "delivery",
          lang,
          customer: `${name}, ${address}`,
        });
        pdfDownloaded = true;
      } catch {
        // PDF ist nur eine Beigabe; WhatsApp trotzdem öffnen.
      }
      const url = whatsAppOrderUrl(
        lines.map((line) => ({ name: line.name, quantity: line.quantity, lineTotal: line.unitPrice * line.quantity })),
        lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
        phone.trim(),
        lang === "ar"
          ? `طلب توصيل jmle إلى ${place.postalCode} ${place.city}`
          : `Lieferanfrage jmle nach ${place.postalCode} ${place.city}`,
        lang,
        {
          reference,
          pdfDownloaded,
          totals,
          details: [
            `${lang === "ar" ? "الاسم" : "Name"}: ${name}`,
            `${lang === "ar" ? "العنوان" : "Adresse"}: ${address}`,
          ],
        }
      );
      goToWhatsApp(pending, url);
      onDone({ kind: "whatsapp", reference, whatsappUrl: url });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border border-amber-200/80 p-4">
      <p className="font-ui text-sm font-semibold">{t("deliveryTitle")}</p>
      <p className="text-xs text-luxury-charcoal/70">{t("deliveryHint")}</p>
      <label className="block text-sm">
        {t("deliveryQuery")}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("deliveryPlaceholder")}
          className="mt-1 w-full min-h-11 rounded-xl border border-amber-200 px-3"
        />
      </label>
      {status === "not_found" && (
        <p className="text-sm text-red-600">{t("deliveryNotFound")}</p>
      )}
      {status === "outside" && (
        <p className="text-sm text-amber-700">{t("deliveryOutside")}</p>
      )}
      {status === "ok" && (
        <p className="text-sm text-green-700">{t("deliveryOk")} {place.postalCode} {place.city}</p>
      )}
      <div className={`grid gap-3 sm:grid-cols-2 ${unlocked ? "" : "pointer-events-none opacity-40"}`}>
        <input required={unlocked} disabled={!unlocked} placeholder={t("street")} value={street} onChange={(e) => setStreet(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
        <input required={unlocked} disabled={!unlocked} placeholder={t("houseNumber")} value={house} onChange={(e) => setHouse(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
        <input required={unlocked} disabled={!unlocked} placeholder={t("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
        <input required={unlocked} disabled={!unlocked} placeholder={t("lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3" />
        <input required={unlocked} disabled={!unlocked} placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 rounded-xl border border-amber-200 px-3 sm:col-span-2" />
      </div>
      <label className={`flex items-start gap-2 text-sm ${unlocked ? "" : "pointer-events-none opacity-40"}`}>
        <input type="checkbox" checked={agb} disabled={!unlocked} onChange={(e) => setAgb(e.target.checked)} className="mt-1" />
        <span>{t("acceptLegal")} <Link href="/legal/agb" className="underline">AGB</Link> · <Link href="/legal/datenschutz" className="underline">{lang === "ar" ? "الخصوصية" : "Datenschutz"}</Link></span>
      </label>
      <button type="submit" disabled={!canSend || busy || sending} className="min-h-12 w-full rounded-xl bg-[#25D366] text-sm font-semibold text-white disabled:opacity-40">
        {t("deliverySend")}
      </button>
    </form>
  );
}
