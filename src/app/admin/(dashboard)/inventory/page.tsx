"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/AdminState";
import { adminProductName } from "@/lib/admin-product-name";
import type { FoodProduct } from "@/types";

export default function InventoryPage() {
  const { t } = useAdminI18n();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/admin/products")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || t("loadFailed"));
        setProducts(d.products ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name_ar, p.name_de, p.barcode].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [products, query]);

  return (
    <div>
      <AdminPageHeader title={t("inventory")} description={loading ? undefined : `${products.length} ${t("products")}`} />
      <label className="relative mb-4 block max-w-md">
        <span className="sr-only">{t("searchNameBarcode")}</span>
        <Search size={16} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchNameBarcode")}
          className="input-field ps-9"
        />
      </label>
      {error ? (
        <AdminError message={error} onRetry={load} />
      ) : loading ? (
        <AdminLoading />
      ) : visible.length === 0 ? (
        <AdminEmpty />
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th className="text-start p-3 sm:p-4 font-medium whitespace-nowrap">{t("productName")}</th>
                  <th className="text-start p-3 sm:p-4 font-medium whitespace-nowrap">{t("weightCustomer")}</th>
                  <th className="text-start p-3 sm:p-4 font-medium whitespace-nowrap">{t("stock")}</th>
                  <th className="p-3 sm:p-4" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const gross = Number(p.gross_weight_value ?? 0);
                  const stock = Number(p.stock_quantity ?? 0);
                  const total = gross * stock;
                  const low = stock <= Number(p.min_stock_alert ?? 5);
                  const isOpen = open === p.id;
                  const name = adminProductName(p);
                  return (
                    <Fragment key={p.id}>
                      <tr className="border-t">
                        <td className="p-3 sm:p-4">
                          <span dir="auto" className="block font-medium">{name.primary}</span>
                          {name.secondary ? (
                            <span dir="auto" className="block text-xs text-gray-400">{name.secondary}</span>
                          ) : null}
                        </td>
                        <td className="p-3 sm:p-4">
                          {p.weight_value != null
                            ? `${p.weight_value} ${p.weight_unit}`
                            : "—"}
                        </td>
                        <td className="p-3 sm:p-4">
                          <span
                            className={`inline-flex min-w-10 justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              low ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {stock}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            className="text-sm text-gold flex items-center gap-1 min-h-11 px-2"
                            onClick={() => setOpen(isOpen ? null : p.id)}
                          >
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {t("showTotalWeight")}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-jmle-warm/50">
                          <td colSpan={4} className="p-3 sm:p-4 text-sm text-gray-600">
                            Nettogewicht: {p.weight_value ?? "—"} {p.weight_unit} ·
                            Versandgewicht/Stück: {p.gross_weight_value ?? "—"}{" "}
                            {p.gross_weight_unit} · Gesamt-Versandgewicht:{" "}
                            <strong>
                              {total} {p.gross_weight_unit}
                            </strong>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
