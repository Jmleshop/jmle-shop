"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEuroDe } from "@/lib/pricing";
import { lineGross, summarizeLines, type Inquiry, type InquiryLine } from "@/lib/inquiry";
import { downloadQuotePdf } from "@/components/cart/QuotePdf";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/AdminState";

type Tab = "whatsapp" | "callback" | "delivery" | "done";
type ProductHit = {
  id: string;
  name_de?: string | null;
  name_ar?: string | null;
  price?: number | null;
  vat_rate?: number | null;
  stock_quantity?: number | null;
};

export default function AdminOrdersPage() {
  const { t } = useAdminI18n();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("callback");
  const [editing, setEditing] = useState<Inquiry | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/admin/inquiries")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Laden fehlgeschlagen");
        setRows(data.inquiries ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = rows.filter((row) => {
    if (tab === "done") return row.status === "done";
    return row.status !== "done" && row.channel === tab;
  });
  const openCallbacks = rows.filter((row) => row.channel === "callback" && row.status === "open").length;
  const done = rows.filter((row) => row.status === "done").length;

  return (
    <div>
      <AdminPageHeader title={t("orders")} description="WhatsApp-Anfragen, Rückrufe und Lieferanfragen, ohne Online-Zahlung." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Gesamtanfragen" value={rows.length} />
        <Stat label="Offene Rückrufe" value={openCallbacks} />
        <Stat label="Bearbeitete Bestellungen" value={done} />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["whatsapp", "Per WhatsApp gesendet"],
            ["callback", "Rückruf / Kontakt erforderlich"],
            ["delivery", "Lieferanfragen (30 km Radius)"],
            ["done", "Abgeschlossen"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`min-h-11 rounded-full px-4 text-sm ${tab === key ? "bg-brand-orange text-white" : "bg-white border"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <AdminError message={error} onRetry={load} />
      ) : loading ? (
        <AdminLoading />
      ) : visible.length === 0 ? (
        <AdminEmpty>Keine Einträge in dieser Ansicht.</AdminEmpty>
      ) : (
        <div className="space-y-4">
          {visible.map((row) => (
            <article key={row.id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">{new Date(row.created_at).toLocaleString("de-DE")}</p>
                  <p className="font-medium">
                    {[row.first_name, row.last_name].filter(Boolean).join(" ") || "WhatsApp-Anfrage"}
                  </p>
                  <p className="text-sm">{row.phone}</p>
                  <p className="text-sm text-gray-500">
                    {[row.street, row.postal_code, row.city, row.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xl font-semibold text-gold-dark">{formatEuroDe(Number(row.total))}</p>
                  <p className="text-xs text-gray-500">
                    {row.invoice_status === "issued" ? `Rechnung ${row.invoice_number}` : "Rechnungsentwurf"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="min-h-11 rounded-xl bg-[#25D366] px-3 py-2 text-sm text-white" href={`https://wa.me/${row.phone.replace(/\D/g, "")}`}>
                  WhatsApp öffnen
                </a>
                <a className="min-h-11 rounded-xl border px-3 py-2 text-sm" href={`tel:${row.phone}`}>
                  Kunden anrufen
                </a>
                <button type="button" className="min-h-11 rounded-xl border px-3 text-sm" onClick={() => setEditing(row)}>
                  Rechnung bearbeiten
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-50"
                  onClick={() => {
                    setBusyId(row.id);
                    void patch(row.id, { status: row.status === "done" ? "open" : "done" })
                      .then((next) => setRows((list) => list.map((r) => (r.id === next.id ? next : r))))
                      .catch((err: Error) => setError(err.message))
                      .finally(() => setBusyId(null));
                  }}
                >
                  {row.status === "done" ? "Wieder öffnen" : "Abschließen"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <InvoiceEditor
          inquiry={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setEditing(next);
            setRows((list) => list.map((row) => (row.id === next.id ? next : row)));
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

async function patch(id: string, body: Record<string, unknown>) {
  const response = await fetch("/api/admin/inquiries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...body }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
  return data.inquiry as Inquiry;
}

function InvoiceEditor({
  inquiry,
  onClose,
  onSaved,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onSaved: (row: Inquiry) => void;
}) {
  const [lines, setLines] = useState<InquiryLine[]>(inquiry.items ?? []);
  const [notes, setNotes] = useState(inquiry.notes ?? "");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const totals = useMemo(() => summarizeLines(lines), [lines]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/inquiries?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => setHits(data.products ?? []))
        .catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (issue = false) => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const next = await patch(inquiry.id, { items: lines, notes, issue });
      onSaved(next);
      setMessage(issue ? "Rechnung ausgestellt." : "Entwurf gespeichert.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="invoice-editor-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="invoice-editor-title" className="text-lg font-semibold">Rechnungsentwurf</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm hover:bg-gray-100">Schließen</button>
        </div>
        {lines.map((line, index) => (
          <div key={`${line.productId}-${index}`} className="mb-2 grid grid-cols-[1fr_5rem_auto] items-center gap-2 text-sm">
            <span>{line.name}</span>
            <input
              type="number"
              min={1}
              value={line.quantity}
              className="min-h-10 rounded-lg border px-2"
              onChange={(e) => {
                const quantity = Math.max(1, Number(e.target.value) || 1);
                setLines((current) => current.map((item, i) => (i === index ? { ...item, quantity } : item)));
              }}
            />
            <button type="button" className="text-red-600" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
              Entfernen
            </button>
            <span className="col-span-3 text-xs text-gray-400">{formatEuroDe(lineGross(line))}</span>
          </div>
        ))}
        <label className="mt-4 block text-sm">
          Produkt hinzufügen
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border px-3" placeholder="Name suchen" />
        </label>
        {hits.length > 0 && (
          <ul className="mt-2 rounded-xl border">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="flex w-full justify-between px-3 py-2 text-start text-sm hover:bg-orange-50"
                  onClick={() => {
                    const list = Number(hit.price ?? 0);
                    const discount = Number((hit as ProductHit & { discount_percent?: number }).discount_percent ?? 0);
                    setLines((current) => [
                      ...current,
                      {
                        productId: hit.id,
                        name: hit.name_de || hit.name_ar || "Produkt",
                        quantity: 1,
                        unitPrice: Math.round(list * (1 - discount / 100) * 100) / 100,
                        vatRate: Number(hit.vat_rate ?? 19),
                      },
                    ]);
                    setQuery("");
                    setHits([]);
                  }}
                >
                  <span>{hit.name_de || hit.name_ar}</span>
                  <span>{formatEuroDe(Number(hit.price ?? 0))} · Bestand {hit.stock_quantity ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4 min-h-20 w-full rounded-xl border p-3 text-sm" placeholder="Anmerkung auf der Rechnung" />
        <p className="mt-3 text-sm">Zwischensumme {formatEuroDe(totals.subtotal)}</p>
        <p className="text-sm">MwSt. {formatEuroDe(totals.vat)}</p>
        <p className="font-semibold">Gesamt {formatEuroDe(totals.total)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={saving} className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-50" onClick={() => void save(false)}>Entwurf speichern</button>
          <button type="button" disabled={saving} className="min-h-11 rounded-xl bg-brand-orange px-3 text-sm text-white disabled:opacity-50" onClick={() => void save(true)}>
            Rechnung ausstellen / Aktivieren
          </button>
          <button
            type="button"
            disabled={inquiry.invoice_status !== "issued" && !inquiry.invoice_number}
            className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-40"
            onClick={() =>
              void downloadQuotePdf({
                protocol: inquiry.id.slice(0, 8),
                phone: inquiry.phone,
                lines,
                kind: "invoice",
                invoiceNumber: inquiry.invoice_number,
                notes,
                customer: [inquiry.first_name, inquiry.last_name].filter(Boolean).join(" "),
              })
            }
          >
            Offizielle Rechnung als PDF herunterladen
          </button>
        </div>
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </div>
    </div>
  );
}
