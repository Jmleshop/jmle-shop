"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";
import { categoryDepth, categoryLabel, sortedCategories } from "@/lib/category-tree";
import { uncategorizedLabel } from "@/lib/category-product-guard";
import ImageUpload from "@/components/admin/ImageUpload";
import SwipeToDeleteRow from "@/components/admin/SwipeToDeleteRow";
import { softDeleteWithUndo } from "@/lib/admin-soft-delete";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { isSaleCategoryId } from "@/lib/category-special";
import { PRODUCT_BADGES, normalizeBadges } from "@/lib/product-badges";
import { useRowSelection } from "@/lib/use-row-selection";
import { productAltText, productsToCsv, type CsvChange, type CsvIssue } from "@/lib/admin-catalog-io";
import { originalImageSrc } from "@/lib/sharp-image";
import type { NumberPlan } from "@/lib/product-numbers";
import BarcodeScanModal from "@/components/admin/BarcodeScanModal";
import { downloadPriceLabels } from "@/components/admin/PriceLabelPdf";
import { compareAlpha } from "@/lib/locale-sort";
import type { FoodCategory, FoodProduct } from "@/types";

type SortKey = "newest" | "oldest" | "priceAsc" | "priceDesc" | "az" | "za";
const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50];
const ORIGINS = ["Syrien", "Türkei", "Palästina"];
const UNITS = ["g", "kg", "ml", "l", "Stück"];

const emptyForm = {
  name_ar: "",
  name_de: "",
  description: "",
  price: "",
  vat_rate: "7",
  vat_custom: false,
  discount_percent: "0",
  discount_custom: false,
  category_id: "",
  brand_id: "",
  brand_name: "",
  images: [] as string[],
  ingredients: "",
  allergens: "",
  origin_country: "",
  weight_value: "",
  weight_unit: "g",
  gross_weight_value: "",
  gross_weight_unit: "g",
  best_before_note: "",
  barcode: "",
  product_number: "",
  purchase_price: "",
  stock_quantity: "0",
  max_order_quantity: "",
  badges: [] as string[],
  custom_note: "",
};

type BrandOption = { id: string; name: string };

export default function AdminProductsPage() {
  const { lang, t } = useAdminI18n();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "ok">("all");
  const [scanning, setScanning] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [listTab, setListTab] = useState<"published" | "draft">("published");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  /** Listen-Klick auf Produktbild → Editor sofort nach Form-Open */
  const [autoOpenImageUrl, setAutoOpenImageUrl] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ changes: CsvChange[]; issues: CsvIssue[] } | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [numberPlan, setNumberPlan] = useState<NumberPlan[] | null>(null);
  const [numberBusy, setNumberBusy] = useState(false);
  const sel = useRowSelection();

  const load = () => {
    sel.clear();
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "true");
    params.set("status", listTab);
    const qs = `?${params.toString()}`;
    Promise.all([
      fetch(`/api/admin/products${qs}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/brands").then((r) => r.json()),
    ]).then(([prod, cats, brandRes]) => {
      setProducts(prod.products ?? []);
      setCategories(cats.categories ?? []);
      const logos = (brandRes.logos ?? []) as Array<{ id?: string; name?: string }>;
      setBrands(
        logos
          .filter((b) => b.id)
          .map((b) => ({ id: String(b.id), name: String(b.name || b.id) }))
          .sort((a, b) => a.name.localeCompare(b.name, "de"))
      );
      setError(prod.error ? String(prod.error) : "");
      setLoading(false);
    });
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, listTab]);


  const openCreate = () => {
    setEditingId(null);
    setAutoOpenImageUrl(null);
    setForm({ ...emptyForm, category_id: categories[0]?.id ?? "" });
    setShowForm(true);
    setError("");
  };

  const openEdit = (p: FoodProduct, opts?: { openImageEditor?: boolean }) => {
    const preset = DISCOUNT_PRESETS.includes(Number(p.discount_percent));
    const images = p.images?.length ? p.images : p.image ? [p.image] : [];
    setEditingId(p.id);
    setForm({
      name_ar: p.name_ar,
      name_de: p.name_de,
      description: p.description ?? "",
      price: String(p.price),
      vat_rate: String(p.vat_rate ?? 19),
      vat_custom: ![7, 19].includes(Number(p.vat_rate ?? 19)),
      discount_percent: String(p.discount_percent ?? 0),
      discount_custom: !preset,
      category_id: p.category_id ?? "",
      brand_id: p.brand_id ?? "",
      brand_name:
        brands.find((b) => b.id === p.brand_id)?.name || "",
      images,
      ingredients: p.ingredients ?? "",
      allergens: p.allergens ?? "",
      origin_country: p.origin_country ?? "",
      weight_value: p.weight_value != null ? String(p.weight_value) : "",
      weight_unit: p.weight_unit || "g",
      gross_weight_value:
        p.gross_weight_value != null ? String(p.gross_weight_value) : "",
      gross_weight_unit: p.gross_weight_unit || "g",
      best_before_note: p.best_before_note ?? "",
      barcode: p.barcode ?? "",
      product_number: p.product_number ?? "",
      purchase_price: p.purchase_price != null ? String(p.purchase_price) : "",
      stock_quantity: String(p.stock_quantity ?? 0),
      max_order_quantity:
        p.max_order_quantity == null || Number(p.max_order_quantity) <= 0
          ? ""
          : String(p.max_order_quantity),
      badges: normalizeBadges(p.badges),
      custom_note: p.custom_note ?? "",
    });
    setAutoOpenImageUrl(
      opts?.openImageEditor ? images[0] || p.image || null : null
    );
    setShowForm(true);
    setError("");
  };

  const toggleBadge = (key: string) =>
    setForm((f) => ({
      ...f,
      badges: f.badges.includes(key)
        ? f.badges.filter((b) => b !== key)
        : [...f.badges, key],
    }));

  const bulkDelete = async () => {
    if (sel.selected.size === 0) return;
    if (
      !confirm(
        `${sel.selected.size} ${t("products")} in den Papierkorb verschieben?`
      )
    )
      return;
    const ids = [...sel.selected];
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        }).then((r) => r.ok)
      )
    );
    const okCount = results.filter(Boolean).length;
    if (okCount > 0) toast.success(`${okCount} in den Papierkorb verschoben`);
    if (okCount < ids.length) toast.error("Einige Aktionen fehlgeschlagen");
    load();
  };


  const handleSubmit = async (e: React.FormEvent, status: "published" | "draft") => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const brandName = form.brand_name.trim();
    const matchedBrand = brands.find(
      (b) =>
        b.id === form.brand_id ||
        b.name.trim().toLowerCase() === brandName.toLowerCase()
    );
    const payload = {
      ...form,
      price: parseFloat(form.price),
      discount_percent: parseFloat(form.discount_percent) || 0,
      vat_rate: Number(form.vat_rate),
      images: form.images,
      image: form.images[0] ?? "",
      brand_id: matchedBrand?.id || form.brand_id || null,
      brand_name: matchedBrand ? null : brandName || null,
      max_order_quantity:
        form.max_order_quantity === "" ||
        form.max_order_quantity === "unlimited" ||
        form.max_order_quantity === "open"
          ? null
          : form.max_order_quantity,
      badges: form.badges,
      custom_note: form.custom_note,
      status,
    };
    const url = editingId
      ? `/api/admin/products/${editingId}`
      : "/api/admin/products";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Fehler");
      setSaving(false);
      return;
    }
    setShowForm(false);
    setSaving(false);
    load();
  };

  const setArchived = async (id: string, archived: boolean) => {
    if (
      !confirm(
        archived ? t("moveToTrashConfirm") : t("restore") + "?"
      )
    )
      return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error || "Aktion fehlgeschlagen");
      return;
    }
    toast.success(archived ? "In den Papierkorb verschoben" : "Wiederhergestellt");
    load();
  };

  const swipeToTrash = async (p: FoodProduct) => {
    if (p.deleted_at) return false;
    const name = p.name_de || p.name_ar || p.id;
    return softDeleteWithUndo({
      kind: "product",
      id: p.id,
      name,
      onDone: load,
    });
  };

  const displayed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = products.filter((p) => {
      if (!showArchived && p.deleted_at) return false;
      const st = p.status ?? "published";
      if (listTab === "draft" ? st !== "draft" : st === "draft") return false;
      if (categoryFilter === "__none__") {
        if (p.category_id) return false;
      } else if (categoryFilter && p.category_id !== categoryFilter) {
        return false;
      }
      const stock = Number(p.stock_quantity ?? 0);
      if (stockFilter === "low" && !(stock > 0 && stock < 5)) return false;
      if (stockFilter === "out" && stock !== 0) return false;
      if (stockFilter === "ok" && stock < 5) return false;
      if (!needle) return true;
      const hay = [p.name_de, p.name_ar, p.product_number, p.barcode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    const nameOf = (p: FoodProduct) =>
      (lang === "ar" ? p.name_ar || p.name_de : p.name_de || p.name_ar || "").trim();
    rows.sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
      }
      if (sortKey === "priceAsc") return Number(a.price) - Number(b.price);
      if (sortKey === "priceDesc") return Number(b.price) - Number(a.price);
      if (sortKey === "az") return compareAlpha(nameOf(a), nameOf(b), lang, "az");
      if (sortKey === "za") return compareAlpha(nameOf(a), nameOf(b), lang, "za");
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });
    return rows;
  }, [
    products,
    showArchived,
    listTab,
    query,
    categoryFilter,
    stockFilter,
    sortKey,
    lang,
  ]);
  const displayedIds = displayed.map((p) => p.id);
  const lowStock = products.filter(
    (p) => !p.deleted_at && Number(p.stock_quantity ?? 0) > 0 && Number(p.stock_quantity) < 5
  );
  const altText = productAltText(form.name_de, form.name_ar);

  const exportCsv = () => {
    const blob = new Blob([productsToCsv(displayed)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produkte.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    const csv = await file.text();
    setCsvText(csv);
    const res = await fetch("/api/admin/products/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast.error(body.error || "CSV fehlgeschlagen");
      return;
    }
    setCsvPreview({ changes: body.changes ?? [], issues: body.issues ?? [] });
  };

  const applyCsv = async () => {
    if (!csvText || csvBusy) return;
    setCsvBusy(true);
    try {
      const res = await fetch("/api/admin/products/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, apply: true }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "CSV fehlgeschlagen");
        return;
      }
      toast.success(`${body.applied ?? 0} Produkte aktualisiert`);
      setCsvPreview(null);
      setCsvText("");
      load();
    } finally {
      setCsvBusy(false);
    }
  };

  const previewNumbers = async () => {
    const res = await fetch("/api/admin/products/numbers");
    const body = await res.json();
    if (!res.ok) {
      toast.error(body.error || "Nummern fehlgeschlagen");
      return;
    }
    setNumberPlan(body.plan ?? []);
  };

  const applyNumbers = async () => {
    if (numberBusy) return;
    setNumberBusy(true);
    try {
      const res = await fetch("/api/admin/products/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Nummern fehlgeschlagen");
        return;
      }
      toast.success(`${body.updated ?? 0} Nummern gesetzt`);
      setNumberPlan(null);
      load();
    } finally {
      setNumberBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">{t("products")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            <button
              type="button"
              className={`px-3 py-2 ${listTab === "published" ? "bg-gold text-white" : "bg-white"}`}
              onClick={() => setListTab("published")}
            >
              {t("published")}
            </button>
            <button
              type="button"
              className={`px-3 py-2 ${listTab === "draft" ? "bg-gold text-white" : "bg-white"}`}
              onClick={() => setListTab("draft")}
            >
              {t("drafts")}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            {t("showArchived")}
          </label>
          <Link
            href="/admin/trash"
            className="text-sm text-gray-600 hover:text-gold underline-offset-2 hover:underline min-h-11 inline-flex items-center"
          >
            {t("trash")} →
          </Link>
          <button
            type="button"
            onClick={() => {
              if (editMode) sel.clear();
              setEditMode((on) => !on);
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium min-h-11 ${editMode ? "bg-gray-900 text-white" : "border border-gray-300"}`}
          >
            {editMode ? "Fertig" : "Bearbeiten"}
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2.5 px-5">
            <Plus size={18} />
            {t("newProduct")}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche: Name DE/AR, SKU, Barcode"
          className="input-field"
          aria-label="Produktsuche"
        />
        <select className="input-field" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="newest">Neueste</option>
          <option value="oldest">Älteste</option>
          <option value="priceAsc">Preis aufsteigend</option>
          <option value="priceDesc">Preis absteigend</option>
          <option value="az">{lang === "ar" ? "أ–ي" : "A–Z"}</option>
          <option value="za">{lang === "ar" ? "ي–أ" : "Z–A"}</option>
        </select>
        <select className="input-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Alle Kategorien</option>
          <option value="__none__">{uncategorizedLabel(lang === "ar" ? "ar" : "de")}</option>
          {sortedCategories(categories).map((c) => (
            <option key={c.id} value={c.id}>{categoryLabel(c)}</option>
          ))}
        </select>
        <select className="input-field" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}>
          <option value="all">Bestand: alle</option>
          <option value="low">Unter 5 Stück</option>
          <option value="out">Ausverkauft</option>
          <option value="ok">Ausreichend</option>
        </select>
      </div>


      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl border px-3 py-2 text-sm min-h-11" onClick={() => void previewNumbers()}>Nummern prüfen</button>
        <button type="button" className="rounded-xl border px-3 py-2 text-sm min-h-11" onClick={exportCsv}>CSV exportieren</button>
        <button type="button" className="rounded-xl border px-3 py-2 text-sm min-h-11" onClick={() => csvInputRef.current?.click()}>CSV importieren</button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importCsv(file);
            e.target.value = "";
          }}
        />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm min-h-11" onClick={() => setScanning(true)}>Barcode scannen</button>
        <button type="button" className="rounded-xl border px-3 py-2 text-sm min-h-11" onClick={() => void downloadPriceLabels(displayed)}>
          Etiketten-PDF
        </button>
      </div>
      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Lagerwarnung: {lowStock.length} Produkt{lowStock.length === 1 ? "" : "e"} unter 5 Stück
          {" — "}
          {lowStock.slice(0, 4).map((p) => p.name_de || p.name_ar).join(", ")}
          {lowStock.length > 4 ? "…" : ""}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-x-hidden overflow-y-auto p-5 sm:p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? t("edit") : t("newProduct")}
              </h2>
              <button type="button" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e, "published")} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">
                    {t("nameAr")} <span className="text-red-500">*</span>
                  </label>
                  <input required dir="rtl" className="input-field" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("nameDe")}</label>
                  <input className="input-field" value={form.name_de} onChange={(e) => setForm({ ...form, name_de: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">{t("description")}</label>
                <textarea rows={2} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">
                    {t("price")} <span className="text-red-500">*</span>
                  </label>
                  <input required type="number" step="0.01" min="0" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">
                    {t("vat")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="input-field"
                    value={form.vat_custom ? "custom" : form.vat_rate}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setForm({ ...form, vat_custom: true, vat_rate: "" });
                      } else {
                        setForm({ ...form, vat_custom: false, vat_rate: e.target.value });
                      }
                    }}
                  >
                    <option value="7">7%</option>
                    <option value="19">19%</option>
                    <option value="custom">{t("customValue")}</option>
                  </select>
                  {form.vat_custom && (
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="input-field mt-2"
                      placeholder="z. B. 5"
                      value={form.vat_rate}
                      onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("discount")}</label>
                  <select
                    className="input-field"
                    value={form.discount_custom ? "custom" : form.discount_percent}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setForm({ ...form, discount_custom: true });
                      } else {
                        setForm({ ...form, discount_custom: false, discount_percent: e.target.value });
                      }
                    }}
                  >
                    {DISCOUNT_PRESETS.map((d) => (
                      <option key={d} value={d}>{d}%</option>
                    ))}
                    <option value="custom">{t("customValue")}</option>
                  </select>
                  {form.discount_custom && (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-field mt-2"
                      value={form.discount_percent}
                      onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">
                  {t("category")} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="input-field"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">—</option>
                  {sortedCategories(categories)
                    .filter((c) => !isSaleCategoryId(c.id))
                    .map((c) => {
                    const depth = categoryDepth(c, categories);
                    const indent = "\u00A0".repeat((depth - 1) * 4);
                    const label = `${indent}${depth > 1 ? "↳ " : ""}${categoryLabel(c)}`;
                    return (
                      <option
                        key={c.id}
                        value={c.id}
                        style={{
                          fontWeight: depth === 1 ? 700 : 400,
                          color: depth === 1 ? "#111827" : "#4b5563",
                        }}
                      >
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">{t("brand")}</label>
                <input
                  className="input-field"
                  list="product-brand-options"
                  placeholder={t("brandHint")}
                  value={form.brand_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    const match = brands.find(
                      (b) => b.name.toLowerCase() === value.trim().toLowerCase()
                    );
                    setForm({
                      ...form,
                      brand_name: value,
                      brand_id: match?.id ?? "",
                    });
                  }}
                />
                <datalist id="product-brand-options">
                  {brands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-gray-500">{t("brandHint")}</p>
              </div>
              <ImageUpload
                multiple
                enableEditor
                folder="products"
                value={form.images}
                autoOpenUrl={autoOpenImageUrl}
                onAutoOpenConsumed={() => setAutoOpenImageUrl(null)}
                onChange={(v) =>
                  setForm({
                    ...form,
                    images: Array.isArray(v) ? v : v ? [v] : [],
                  })
                }
              />
              <p className="text-xs text-gray-500">SEO-Alt-Text: {altText}</p>
              <div>
                <label className="block text-sm mb-1">{t("ingredients")}</label>
                <textarea rows={2} className="input-field" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">{t("allergens")}</label>
                <input className="input-field" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">{t("origin")}</label>
                <input className="input-field" list="origin-list" value={form.origin_country} onChange={(e) => setForm({ ...form, origin_country: e.target.value })} />
                <datalist id="origin-list">
                  {ORIGINS.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
              <fieldset className="border border-gray-100 rounded-xl p-3 space-y-2">
                <legend className="text-sm font-medium px-1">{t("weightCustomer")}</legend>
                <p className="text-[11px] text-gray-500 leading-relaxed">{t("weightAutoHint")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t("weightNetQty")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field"
                      placeholder="z. B. 500"
                      value={form.weight_value}
                      onChange={(e) => setForm({ ...form, weight_value: e.target.value })}
                      aria-label="net_quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t("weightUnitLabel")}</label>
                    <select
                      className="input-field"
                      value={form.weight_unit}
                      onChange={(e) => setForm({ ...form, weight_unit: e.target.value })}
                      aria-label="unit"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>
              <fieldset className="border border-amber-100 bg-amber-50/40 rounded-xl p-3 space-y-2">
                <legend className="text-sm font-medium px-1">{t("weightShipping")}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" className="input-field" value={form.gross_weight_value} onChange={(e) => setForm({ ...form, gross_weight_value: e.target.value })} />
                  <select className="input-field" value={form.gross_weight_unit} onChange={(e) => setForm({ ...form, gross_weight_unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </fieldset>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">{t("barcode")}</label>
                  <input className="input-field" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("productNumber")}</label>
                  <input className="input-field" value={form.product_number} onChange={(e) => setForm({ ...form, product_number: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">{t("purchasePrice")}</label>
                  <input type="number" step="0.01" className="input-field" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("stock")}</label>
                  <input type="number" min="0" className="input-field" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("maxOrder")}</label>
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <input
                      type="checkbox"
                      checked={form.max_order_quantity === ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          max_order_quantity: e.target.checked ? "" : "10",
                        })
                      }
                    />
                    Offen / Dynamisch (Limit = Lagerbestand)
                  </label>
                  {form.max_order_quantity !== "" && (
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={form.max_order_quantity}
                      onChange={(e) =>
                        setForm({ ...form, max_order_quantity: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">{t("bestBefore")}</label>
                <input className="input-field" value={form.best_before_note} onChange={(e) => setForm({ ...form, best_before_note: e.target.value })} />
              </div>
              <fieldset className="border border-gray-100 rounded-xl p-3 space-y-3">
                <legend className="text-sm font-medium px-1">Badges &amp; Notiz</legend>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_BADGES.map((b) => {
                    const active = form.badges.includes(b.key);
                    return (
                      <button
                        type="button"
                        key={b.key}
                        onClick={() => toggleBadge(b.key)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-2 px-3 py-2 min-h-11 rounded-xl border text-sm transition-colors ${
                          active
                            ? "border-gold bg-gold/10 text-gold-dark"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block w-9 h-5 rounded-full relative transition-colors ${
                            active ? "bg-gold" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                              active ? "left-4" : "left-0.5"
                            }`}
                          />
                        </span>
                        {b.labelDe}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-sm mb-1">
                    Eigene Notiz (z. B. Frisch eingetroffen)
                  </label>
                  <input
                    className="input-field"
                    maxLength={200}
                    placeholder="Frisch eingetroffen"
                    value={form.custom_note}
                    onChange={(e) =>
                      setForm({ ...form, custom_note: e.target.value })
                    }
                  />
                </div>
              </fieldset>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={saving}
                  className="w-full py-3 rounded-xl border border-gray-300 font-medium"
                  onClick={(e) => handleSubmit(e, "draft")}
                >
                  {saving ? t("saving") : t("saveDraft")}
                </button>
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sel.selected.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 mb-3 p-3 rounded-xl bg-gold/10 border border-gold/30">
          <span className="text-sm font-medium">
            {sel.selected.size} ausgewählt
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sel.clear()}
              className="px-3 py-2 rounded-xl border border-gray-300 text-sm min-h-11"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium inline-flex items-center gap-2 min-h-11"
            >
              <Trash2 size={16} />
              Ausgewählte in den Papierkorb
            </button>
          </div>
        </div>
      )}

      {!loading && error && !showForm && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Produkte konnten nicht geladen werden: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="px-4 py-2 text-[11px] text-gray-400 border-b bg-gray-50/80">
            {editMode
              ? "Auswahl, Stift und Papierkorb sind sichtbar. „Fertig“ blendet sie wieder aus."
              : "„Bearbeiten“ oben rechts zeigt Auswahl, Stift und Papierkorb."}
            {!error && (
              <span className="ms-2 text-gray-500">
                ({displayed.length} / {products.length})
              </span>
            )}
          </p>
          <div className={`hidden sm:grid ${editMode ? "grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto]" : "grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)]"} gap-2 px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50/95 sticky top-0 z-10 border-b`}>
            <span className="flex items-center gap-2">
              {editMode && (
                <input
                  type="checkbox"
                  checked={sel.allSelected(displayedIds)}
                  onChange={() => sel.toggleAll(displayedIds)}
                  aria-label="Alle auswählen"
                  className="w-4 h-4 accent-gold"
                />
              )}
              {t("nameAr")}
            </span>
            <span>{t("productNumber")}</span>
            <span>{t("price")}</span>
            <span>{t("stock")}</span>
            {editMode && <span className="text-right">Aktionen</span>}
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y">
            {displayed.map((p, idx) => {
              return (
                <SwipeToDeleteRow
                  key={p.id}
                  disabled={!editMode || !!p.deleted_at}
                  label={t("archive")}
                  onSwipeDelete={() => swipeToTrash(p)}
                >
                  <div
                    className={`grid grid-cols-1 ${editMode ? "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto]" : "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)]"} gap-1 sm:gap-2 items-center px-4 py-3 sm:py-2.5 text-sm min-h-[52px]`}
                  >
                    <div className="font-medium min-w-0 flex items-center gap-2">
                      {editMode && (
                        <input
                          type="checkbox"
                          checked={sel.isSelected(p.id)}
                          onChange={() => {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            sel.onSelect(displayedIds, idx, e.shiftKey);
                          }}
                          aria-label={`${p.name_ar || p.name_de} auswählen`}
                          className="shrink-0 w-4 h-4 accent-gold"
                        />
                      )}
                      {p.image ? (
                        <button
                          type="button"
                          className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-orange-200/80 bg-white ring-offset-2 hover:ring-2 hover:ring-brand-orange/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p, { openImageEditor: true });
                          }}
                          title={lang === "de" ? "Bild anpassen" : "ضبط الصورة"}
                          aria-label={lang === "de" ? "Bild anpassen" : "ضبط الصورة"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={originalImageSrc(p.image)}
                            alt=""
                            className="h-full w-full object-contain object-center"
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="h-12 w-12 shrink-0 rounded-lg bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p, { openImageEditor: true });
                          }}
                          aria-label={lang === "de" ? "Bild hinzufügen" : "إضافة صورة"}
                        />
                      )}
                      <div className="min-w-0">
                      <span
                        className="truncate block"
                        dir="rtl"
                      >
                        {p.name_ar || p.name_de}
                      </span>
                      {p.name_de && (
                        <span className="truncate block text-xs text-gray-400">{p.name_de}</span>
                      )}
                      {p.status === "draft" && (
                        <span className="text-[11px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {t("drafts")}
                        </span>
                      )}
                      {(!p.category_id ||
                        !categories.some((c) => c.id === p.category_id && !c.deleted_at)) && (
                        <span className="text-[11px] uppercase tracking-wide text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {uncategorizedLabel(lang === "ar" ? "ar" : "de")}
                        </span>
                      )}
                      <span className="sm:hidden text-xs text-gray-500">
                        {formatEuroDe(Number(p.price))} · Bestand {p.stock_quantity}
                      </span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-gray-500 truncate">
                      {p.product_number || "—"}
                    </div>
                    <div className="hidden sm:block">
                      {formatEuroDe(Number(p.price))}
                    </div>
                    <div className={`hidden sm:block ${Number(p.stock_quantity) < 5 ? "font-semibold text-amber-700" : ""}`}>
                      {p.stock_quantity}
                      {Number(p.stock_quantity) < 5 ? " · niedrig" : ""}
                    </div>
                    {editMode && (
                      <div className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center"
                          onClick={() => openEdit(p)}
                          aria-label="Bearbeiten"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center"
                          onClick={() => setArchived(p.id, !p.deleted_at)}
                          aria-label={p.deleted_at ? t("restore") : t("archive")}
                        >
                          {p.deleted_at ? (
                            <ArchiveRestore size={16} />
                          ) : (
                            <Archive size={16} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </SwipeToDeleteRow>
              );
            })}
          </div>
        </div>
      )}

      {csvPreview && (
        <div className="fixed inset-0 z-[220] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5">
            <h2 className="text-lg font-semibold mb-1">CSV-Änderungen</h2>
            <p className="text-sm text-gray-500 mb-4">
              Zeilen ohne ID oder mit ungültigem Preis werden übersprungen. Speichern schreibt nur die gelisteten Felder.
            </p>
            {csvPreview.issues.length > 0 && (
              <ul className="mb-4 text-sm text-red-700 bg-red-50 rounded-xl p-3 space-y-1">
                {csvPreview.issues.map((issue) => (
                  <li key={`${issue.row}-${issue.message}`}>Zeile {issue.row}: {issue.message}</li>
                ))}
              </ul>
            )}
            {csvPreview.changes.length === 0 ? (
              <p className="text-sm text-gray-600 mb-4">Keine Feldänderungen.</p>
            ) : (
              <ul className="mb-4 divide-y text-sm max-h-80 overflow-y-auto border rounded-xl">
                {csvPreview.changes.map((change) => (
                  <li key={`${change.id}-${change.field}`} className="px-3 py-2">
                    <span className="font-medium" dir="rtl">{change.name}</span>
                    <span className="text-gray-500"> · {change.field}: {change.from || "—"} → {change.to}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-xl border px-4 py-2 text-sm min-h-11" disabled={csvBusy} onClick={() => setCsvPreview(null)}>
                Schließen
              </button>
              <button type="button" className="rounded-xl bg-gold px-4 py-2 text-sm text-white min-h-11 disabled:opacity-50" disabled={csvBusy || csvPreview.changes.length === 0} onClick={() => void applyCsv()}>
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
      {numberPlan && (
        <div className="fixed inset-0 z-[220] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5">
            <h2 className="text-lg font-semibold mb-1">Produktnummern</h2>
            <p className="text-sm text-gray-500 mb-4">
              Vorschlag nach Erstelldatum, das älteste Produkt bekommt 1. Nichts ist gespeichert, bis du übernimmst.
            </p>
            <ul className="mb-4 divide-y text-sm max-h-80 overflow-y-auto border rounded-xl">
              {numberPlan.filter((row) => row.from !== row.to).slice(0, 80).map((row) => (
                <li key={row.id} className="px-3 py-2">
                  <span className="font-medium" dir="rtl">{row.name}</span>
                  <span className="text-gray-500"> · {row.from || "—"} → {row.to}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mb-4">
              {numberPlan.filter((row) => row.from !== row.to).length} Nummern würden sich ändern.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-xl border px-4 py-2 text-sm min-h-11" disabled={numberBusy} onClick={() => setNumberPlan(null)}>
                Schließen
              </button>
              <button
                type="button"
                className="rounded-xl bg-gold px-4 py-2 text-sm text-white min-h-11 disabled:opacity-50"
                disabled={numberBusy || numberPlan.every((row) => row.from === row.to)}
                onClick={() => void applyNumbers()}
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
      {scanning && (
        <BarcodeScanModal
          onClose={() => setScanning(false)}
          onDetect={(code) => {
            setQuery(code);
            setScanning(false);
          }}
        />
      )}
    </div>
  );
}
