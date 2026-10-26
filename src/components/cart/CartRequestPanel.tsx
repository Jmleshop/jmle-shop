"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, MessageCircle, PhoneCall, Truck, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ShopLang } from "@/lib/shop-i18n";
import { shopText } from "@/lib/shop-i18n";
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
async function saveInquiry(
  body: Record<string, unknown>,
  lang: ShopLang
): Promise<{ reference: string | null; error?: string }> {
  const fallback = shopText(lang, "inquiryFailed");
  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    // Server-Meldungen sind deutsch — im arabischen Shop die übersetzte Standardmeldung zeigen
    if (!response.ok || !payload.id) {
      return { reference: null, error: lang === "de" && payload.error ? String(payload.error) : fallback };
    }
    return { reference: String(payload.id).slice(0, 8) };
  } catch {
    return { reference: null, error: fallback };
  }
}

type Channel = "whatsapp" | "callback" | "delivery";

const CHANNEL_ICONS = { whatsapp: MessageCircle, callback: PhoneCall, delivery: Truck } as const;

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
    if (busy) return;
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
      }, lang);

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

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Channel | null>(null);
  const [step, setStep] = useState<"choose" | "form">("choose");

  const openDialog = () => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setStep(choice ? "form" : "choose");
    setError("");
    setOpen(true);
  };

  const closeDialog = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.();
  }, []);

  // Ergebnis anzeigen → Auswahldialog schließen (Warenkorb bleibt unverändert)
  useEffect(() => {
    if (result) setOpen(false);
  }, [result]);

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    window.setTimeout(() => {
      const preferred = root?.querySelector<HTMLElement>("[data-autofocus]");
      (preferred ?? focusables()[0])?.focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, step, closeDialog]);

  const options: Array<{ id: Channel; title: string; desc: string }> = [
    { id: "whatsapp", title: t("whatsapp"), desc: t("optWhatsappDesc") },
    { id: "callback", title: t("optCallbackTitle"), desc: t("optCallbackDesc") },
    { id: "delivery", title: t("deliveryTitle"), desc: t("optDeliveryDesc") },
  ];
  const phoneOk = phone.trim().length >= 6;
  const legalLinks = (
    <>
      {t("acceptLegal")}{" "}
      <Link href="/legal/agb" className="underline">{t("termsLabel")}</Link>
      {" · "}
      <Link href="/legal/datenschutz" className="underline">{t("privacyLabel")}</Link>
    </>
  );
  const inputCls = "min-h-11 w-full rounded-xl border border-amber-200 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50";

  return (
    <div className="mt-4">
      <Button fullWidth size="lg" onClick={openDialog} disabled={lines.length === 0} aria-haspopup="dialog">
        {t("buyNow", { total: totalLabel })}
      </Button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-boutique sm:rounded-3xl"
          >
            <div className="flex items-center gap-2 border-b border-amber-100 px-4 py-3">
              {step === "form" && (
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-jmle-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                  aria-label={t("backBtn")}
                >
                  <ArrowLeft size={20} className="rtl:rotate-180" aria-hidden />
                </button>
              )}
              <h2 id={titleId} className="flex-1 font-ui text-base font-semibold text-luxury-ink">
                {step === "form" && choice ? options.find((o) => o.id === choice)?.title : t("buyDialogTitle")}
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-jmle-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                aria-label={t("close")}
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4">
              {step === "choose" && (
                <div className="space-y-3">
                  <p className="text-sm text-luxury-charcoal/70">{t("buyDialogHint", { total: totalLabel })}</p>
                  <div role="radiogroup" aria-labelledby={titleId} className="space-y-2.5">
                    {options.map((opt, i) => {
                      const Icon = CHANNEL_ICONS[opt.id];
                      const selected = choice === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          data-autofocus={selected || (!choice && i === 0) ? "" : undefined}
                          onClick={() => setChoice(opt.id)}
                          onDoubleClick={() => {
                            setChoice(opt.id);
                            setStep("form");
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60",
                            selected
                              ? "border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange"
                              : "border-amber-200 hover:border-brand-orange/50"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                              opt.id === "callback" ? "bg-brand-orange/10 text-brand-orange" : "bg-[#25D366]/10 text-[#128C7E]"
                            )}
                            aria-hidden
                          >
                            <Icon size={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-ui text-sm font-semibold text-luxury-ink">{opt.title}</span>
                            <span className="mt-0.5 block text-xs text-luxury-charcoal/75">{opt.desc}</span>
                          </span>
                          <span
                            className={cn(
                              "mt-1 h-5 w-5 shrink-0 rounded-full border-2",
                              selected ? "border-brand-orange bg-brand-orange shadow-[inset_0_0_0_3px_white]" : "border-amber-300"
                            )}
                            aria-hidden
                          />
                        </button>
                      );
                    })}
                  </div>
                  <Button fullWidth size="lg" disabled={!choice} onClick={() => setStep("form")}>
                    {t("continueBtn")}
                  </Button>
                  <Link href="/checkout" className="block py-2 text-center text-xs text-luxury-charcoal/70 underline">
                    {t("payByCard")}
                  </Link>
                </div>
              )}

              {step === "form" && choice === "whatsapp" && (
                <div className="space-y-3">
                  <label className="block text-sm">
                    {t("phone")}
                    <input
                      data-autofocus=""
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn("mt-1", inputCls)}
                      inputMode="tel"
                      required
                      aria-describedby="wa-phone-hint"
                    />
                    <span id="wa-phone-hint" className={cn("mt-1 block text-xs", phone && !phoneOk ? "text-red-600" : "text-luxury-charcoal/60")}>
                      {t("phoneHint")}
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={agb} onChange={(e) => setAgb(e.target.checked)} className="mt-1" />
                    <span>{legalLinks}</span>
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
              )}

              {step === "form" && choice === "callback" && (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send("callback");
                  }}
                >
                  <p className="text-sm text-luxury-charcoal/70">{t("offerTitle")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input data-autofocus="" required autoComplete="given-name" aria-label={t("firstName")} placeholder={t("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                    <input required autoComplete="family-name" aria-label={t("lastName")} placeholder={t("lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                  </div>
                  <input required type="tel" autoComplete="tel" minLength={6} aria-label={t("phone")} placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  <input type="email" autoComplete="email" aria-label={t("emailOptional")} placeholder={t("emailOptional")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                  <input autoComplete="street-address" aria-label={t("streetOptional")} placeholder={t("streetOptional")} value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} />
                  <div className="relative grid gap-3 sm:grid-cols-2">
                    <input
                      aria-label={t("postalCodeLabel")}
                      placeholder={t("postalCodeLabel")}
                      autoComplete="postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className={inputCls}
                      inputMode="numeric"
                    />
                    <input aria-label={t("cityLabel")} placeholder={t("cityLabel")} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
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
                  <button type="submit" disabled={busy || !phoneOk} className="min-h-12 w-full rounded-xl bg-brand-orange text-sm font-semibold text-white disabled:opacity-40">
                    {t("requestOffer")}
                  </button>
                </form>
              )}

              {step === "form" && choice === "delivery" && (
                <HomeDelivery lines={lines} totals={totals} busy={busy} onDone={setResult} onError={setError} />
              )}

              {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
            </div>
          </div>
        </div>,
        document.body
      )}

      {result && createPortal(
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-boutique" role="dialog" aria-modal="true">
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
            <button type="button" autoFocus className="mt-3 min-h-11 rounded-xl bg-brand-orange px-5 text-white" onClick={() => setResult(null)}>
              {t("close")}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
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
      }, lang);
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
    <form onSubmit={(event) => void submit(event)} className="space-y-3">
      <p className="text-xs text-luxury-charcoal/70">{t("deliveryHint")}</p>
      <label className="block text-sm">
        {t("deliveryQuery")}
        <input
          data-autofocus=""
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("deliveryPlaceholder")}
          className="mt-1 w-full min-h-11 rounded-xl border border-amber-200 px-3"
        />
      </label>
      {status === "not_found" && (
        <p className="text-sm text-red-600" role="alert">{t("deliveryNotFound")}</p>
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
        <span>{t("acceptLegal")} <Link href="/legal/agb" className="underline">{t("termsLabel")}</Link> · <Link href="/legal/datenschutz" className="underline">{t("privacyLabel")}</Link></span>
      </label>
      <button type="submit" disabled={!canSend || busy || sending} className="min-h-12 w-full rounded-xl bg-[#25D366] text-sm font-semibold text-white disabled:opacity-40">
        {t("deliverySend")}
      </button>
    </form>
  );
}
