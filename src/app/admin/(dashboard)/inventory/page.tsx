"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import type { FoodProduct } from "@/types";

export default function InventoryPage() {
  const { t } = useAdminI18n();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{t("inventory")}</h1>
      <div className="bg-white rounded-2xl border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">{t("nameDe")}</th>
              <th className="text-left p-4">{t("weightCustomer")}</th>
              <th className="text-left p-4">{t("stock")}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const gross = Number(p.gross_weight_value ?? 0);
              const total = gross * Number(p.stock_quantity ?? 0);
              const isOpen = open === p.id;
              return (
                <Fragment key={p.id}>
                  <tr key={p.id} className="border-t">
                    <td className="p-4 font-medium">{p.name_de}</td>
                    <td className="p-4">
                      {p.weight_value != null
                        ? `${p.weight_value} ${p.weight_unit}`
                        : "—"}
                    </td>
                    <td className="p-4">{p.stock_quantity}</td>
                    <td className="p-4">
                      <button
                        className="text-sm text-gold flex items-center gap-1"
                        onClick={() => setOpen(isOpen ? null : p.id)}
                      >
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Gesamtgewicht anzeigen
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-jmle-warm/50">
                      <td colSpan={4} className="p-4 text-sm text-gray-600">
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
  );
}
