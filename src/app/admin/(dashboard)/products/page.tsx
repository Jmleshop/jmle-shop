"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Plus, X, Trash2 } from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";
import { categoryDepth, categoryLabel, sortedCategories } from "@/lib/category-tree";
import ImageUpload from "@/components/admin/ImageUpload";
import SwipeToDeleteRow from "@/components/admin/SwipeToDeleteRow";
import { softDeleteWithUndo } from "@/lib/admin-soft-delete";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { isSaleCategoryId } from "@/lib/category-special";
import { PRODUCT_BADGES, normalizeBadges } from "@/lib/product-badges";
import type { FoodCategory, FoodProduct } from "@/types";

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50];
const ORIGINS = ["Syrien", "Türkei", "Palästina"];
const UNITS = ["g", "kg", "ml", "l", "Stück"];

const emptyForm = {
  name_ar: "",
  name_de: "",
  description: "",
  price: "",
  vat_rate: "19",
  vat_custom: false,
  discount_percent: "0",
  discount_custom: false,
  category_id: "",
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

export default function AdminProductsPage() {
  const { t } = useAdminI18n();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [listTab, setListTab] = useState<"published" | "draft">("published");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const load = () => {
    setSelected(new Set());
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "true");
    params.set("status", listTab);
    const qs = `?${params.toString()}`;
    Promise.all([
      fetch(`/api/admin/products${qs}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([prod, cats]) => {
      setProducts(prod.products ?? []);
      setCategories(cats.categories ?? []);
      if (prod.error) setError(prod.error);
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
    setForm({ ...emptyForm, category_id: categories[0]?.id ?? "" });
    setShowForm(true);
    setError("");
  };

  const openEdit = (p: FoodProduct) => {
    const preset = DISCOUNT_PRESETS.includes(Number(p.discount_percent));
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
      images: p.images?.length ? p.images : p.image ? [p.image] : [],
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
    if (selected.size === 0) return;
    if (
      !confirm(
        `${selected.size} ${t("products")} in den Papierkorb verschieben?`
      )
    )
      return;
    const ids = [...selected];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        })
      )
    );
    load();
  };

  const handleSubmit = async (e: React.FormEvent, status: "published" | "draft") => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      price: parseFloat(form.price),
      discount_percent: parseFloat(form.discount_percent) || 0,
      vat_rate: Number(form.vat_rate),
      images: form.images,
      image: form.images[0] ?? "",
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
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
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
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2.5 px-5">
            <Plus size={18} />
            {t("newProduct")}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
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
              <ImageUpload
                multiple
                enableCrop
                folder="products"
                value={form.images}
                onChange={(v) =>
                  setForm({
                    ...form,
                    images: Array.isArray(v) ? v : v ? [v] : [],
                  })
                }
              />
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

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-xl bg-gold/10 border border-gold/30">
          <span className="text-sm font-medium">
            {selected.size} ausgewählt
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
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
              Ausgewählte löschen
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="px-4 py-2 text-[11px] text-gray-400 border-b bg-gray-50/80">
            Tipp: Zeile nach rechts wischen → Papierkorb (Soft Delete). Bearbeiten-Buttons bleiben nutzbar.
          </p>
          <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto] gap-2 px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50/95 sticky top-0 z-10 border-b">
            <span>{t("nameDe")}</span>
            <span>{t("productNumber")}</span>
            <span>{t("price")}</span>
            <span>{t("stock")}</span>
            <span className="text-right">Aktionen</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y">
            {products
              .filter((p) => {
                if (!showArchived && p.deleted_at) return false;
                const st = p.status ?? "published";
                return listTab === "draft" ? st === "draft" : st !== "draft";
              })
              .map((p) => (
                <SwipeToDeleteRow
                  key={p.id}
                  disabled={!!p.deleted_at}
                  label={t("archive")}
                  onSwipeDelete={() => swipeToTrash(p)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto] gap-1 sm:gap-2 items-center px-4 py-3 sm:py-2.5 text-sm min-h-[52px]">
                    <div className="font-medium min-w-0 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${p.name_de || p.name_ar} auswählen`}
                        className="shrink-0 w-4 h-4 accent-gold"
                      />
                      <div className="min-w-0">
                      <span className="truncate block">
                        {p.name_de || p.name_ar}
                      </span>
                      {p.status === "draft" && (
                        <span className="text-[11px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {t("drafts")}
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
                    <div className="hidden sm:block">{p.stock_quantity}</div>
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
                  </div>
                </SwipeToDeleteRow>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
