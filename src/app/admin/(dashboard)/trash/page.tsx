"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArchiveRestore, Trash2, Package, FolderTree } from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import type { FoodCategory, FoodProduct } from "@/types";

type Tab = "products" | "categories";

export default function AdminTrashPage() {
  const { t } = useAdminI18n();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/admin/trash")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Fehler");
        setProducts(d.products ?? []);
        setCategories(d.categories ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restoreProduct = async (id: string) => {
    if (!confirm(t("restore") + "?")) return;
    setBusyId(id);
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    setBusyId(null);
    load();
  };

  const purgeProduct = async (id: string, name: string) => {
    const ok = confirm(
      `Möchtest du das Produkt „${name}“ wirklich unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`
    );
    if (!ok) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Löschen fehlgeschlagen");
      return;
    }
    load();
  };

  const restoreCategory = async (id: string) => {
    if (!confirm(t("restore") + "?")) return;
    setBusyId(id);
    await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    setBusyId(null);
    load();
  };

  const purgeCategory = async (id: string, name: string) => {
    const ok = confirm(
      `Möchtest du die Kategorie „${name}“ wirklich unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`
    );
    if (!ok) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Löschen fehlgeschlagen");
      return;
    }
    load();
  };

  const formatDeleted = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("de-DE");
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Trash2 size={22} className="text-gray-500" aria-hidden />
            {t("trash")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Soft-Delete: Einträge wiederherstellen oder endgültig löschen. Aktive
            Shop-Daten bleiben unberührt.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-sm text-gold hover:underline min-h-11 inline-flex items-center"
        >
          ← {t("products")}
        </Link>
      </div>

      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm mb-6 w-fit">
        <button
          type="button"
          className={`px-4 py-2.5 min-h-11 inline-flex items-center gap-2 ${
            tab === "products" ? "bg-gold text-white" : "bg-white"
          }`}
          onClick={() => setTab("products")}
        >
          <Package size={16} />
          {t("products")} ({products.length})
        </button>
        <button
          type="button"
          className={`px-4 py-2.5 min-h-11 inline-flex items-center gap-2 ${
            tab === "categories" ? "bg-gold text-white" : "bg-white"
          }`}
          onClick={() => setTab("categories")}
        >
          <FolderTree size={16} />
          {t("categories")} ({categories.length})
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-500">…</p>
      ) : tab === "products" ? (
        products.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border p-8 text-center">
            Keine Produkte im Papierkorb.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Preis</th>
                    <th className="text-left p-3 font-medium">Gelöscht am</th>
                    <th className="text-right p-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const name = p.name_de || p.name_ar || p.id;
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium">{name}</td>
                        <td className="p-3">{formatEuroDe(Number(p.price))}</td>
                        <td className="p-3 text-gray-500">
                          {formatDeleted(p.deleted_at)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void restoreProduct(p.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium me-2"
                          >
                            <ArchiveRestore size={14} />
                            {t("restore")}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void purgeProduct(p.id, name)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium"
                          >
                            <Trash2 size={14} />
                            {t("purge")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border p-8 text-center">
          Keine Kategorien im Papierkorb.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Gelöscht am</th>
                  <th className="text-right p-3" />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const name = c.name_de || c.name_ar || c.id;
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="p-3 font-medium">{name}</td>
                      <td className="p-3 text-gray-500">
                        {formatDeleted(c.deleted_at)}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void restoreCategory(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium me-2"
                        >
                          <ArchiveRestore size={14} />
                          {t("restore")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void purgeCategory(c.id, name)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium"
                        >
                          <Trash2 size={14} />
                          {t("purge")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
