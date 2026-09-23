"use client";

import { useEffect, useState } from "react";
import { formatPriceDe } from "@/lib/catalog";
import type { Order } from "@/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    pending: "Ausstehend",
    paid: "Bezahlt",
    cancelled: "Storniert",
    refunded: "Erstattet",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Verkäufe</h1>
      <p className="text-gray-500 text-sm mb-8">
        Alle Bestellungen und Umsätze im Überblick
      </p>

      {loading ? (
        <p className="text-gray-500">Lade Bestellungen...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">
          Noch keine Bestellungen vorhanden.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(order.created_at).toLocaleString("de-DE")}
                  </p>
                  <p className="font-medium">
                    {order.customer_email || "Gast-Bestellung"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-gold-dark">
                    {formatPriceDe(Number(order.total))}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                      order.status === "paid"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusLabel[order.status] ?? order.status}
                  </span>
                </div>
              </div>

              {order.discount_code && (
                <p className="text-sm text-green-600 mb-3">
                  Rabattcode: {order.discount_code} (−
                  {formatPriceDe(Number(order.discount_amount))})
                </p>
              )}

              {order.order_items && order.order_items.length > 0 && (
                <div className="border-t pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left pb-2 font-medium">Produkt</th>
                        <th className="text-center pb-2 font-medium">Menge</th>
                        <th className="text-right pb-2 font-medium">Preis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.order_items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1" dir="rtl">
                            {item.product_name}
                          </td>
                          <td className="py-1 text-center">{item.quantity}</td>
                          <td className="py-1 text-right">
                            {formatPriceDe(Number(item.price) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
