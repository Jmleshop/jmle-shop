"use client";

import { useState } from "react";
import { ChevronDown, Download, Package } from "lucide-react";
import type { Order } from "@/types";
import type { InvoiceProfile } from "@/lib/orders";
import {
  formatEuroDe,
  formatOrderDate,
  invoiceNumber,
  lineTotal,
  orderStatusLabel,
} from "@/lib/orders";
import { downloadOrderInvoice } from "@/components/profile/InvoicePdf";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { toast } from "@/components/AppToaster";

const toneMap = {
  success: "success" as const,
  warning: "gold" as const,
  neutral: "neutral" as const,
  danger: "sale" as const,
};

export default function OrderHistory({
  orders,
  profile,
}: {
  orders: Order[];
  profile: InvoiceProfile | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200/50 bg-white p-8 text-center">
        <Package size={36} className="mx-auto text-gray-300 mb-3" aria-hidden />
        <p className="font-ui text-gray-500 text-sm">لا توجد طلبات بعد</p>
        <p className="text-xs text-gray-400 mt-1">Noch keine Bestellungen</p>
      </div>
    );
  }

  const handleDownload = async (order: Order) => {
    setDownloading(order.id);
    try {
      await downloadOrderInvoice(order, profile);
      toast.success("تم تنزيل الفاتورة");
    } catch (err) {
      console.error(err);
      toast.error("تعذر إنشاء الفاتورة");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const open = openId === order.id;
        const status = orderStatusLabel(order.status);
        const panelId = `order-panel-${order.id}`;
        const btnId = `order-btn-${order.id}`;

        return (
          <article
            key={order.id}
            className="rounded-2xl border border-amber-200/50 bg-white overflow-hidden shadow-sm"
          >
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : order.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-start min-h-14 hover:bg-jmle-warm/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-ui text-sm font-medium text-luxury-ink truncate">
                    {invoiceNumber(order)}
                  </p>
                  <p className="text-xs text-gray-500 font-ui mt-0.5">
                    {formatOrderDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={toneMap[status.tone]} title={status.de}>
                    {status.ar}
                  </Badge>
                  <span className="font-ui font-semibold text-sm text-gold tabular-nums">
                    {formatEuroDe(Number(order.total))}
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "text-gold transition-transform duration-300",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </div>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!open}
              className={cn(open && "animate-fade-up border-t border-amber-100")}
            >
              {open && (
                <div className="p-4 space-y-4">
                  <ul className="space-y-2">
                    {(order.order_items ?? []).map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 text-sm font-ui"
                      >
                        <span className="min-w-0 truncate" dir="auto">
                          {item.product_name}{" "}
                          <span className="text-gray-400">× {item.quantity}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatEuroDe(lineTotal(item))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="text-xs font-ui text-gray-600 space-y-1 border-t border-amber-50 pt-3">
                    <div className="flex justify-between">
                      <dt>Zwischensumme</dt>
                      <dd>{formatEuroDe(Number(order.subtotal))}</dd>
                    </div>
                    {Number(order.discount_amount) > 0 && (
                      <div className="flex justify-between">
                        <dt>
                          Rabatt
                          {order.discount_code
                            ? ` (${order.discount_code})`
                            : ""}
                        </dt>
                        <dd>−{formatEuroDe(Number(order.discount_amount))}</dd>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-luxury-ink">
                      <dt>Gesamt</dt>
                      <dd>{formatEuroDe(Number(order.total))}</dd>
                    </div>
                  </dl>

                  <div className="rounded-xl bg-jmle-warm/60 p-3 text-xs font-ui text-gray-600">
                    <p className="font-medium text-luxury-ink mb-1">
                      Lieferadresse / عنوان التوصيل
                    </p>
                    <p>
                      {[profile?.first_name, profile?.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </p>
                    {profile?.street && <p>{profile.street}</p>}
                    <p dir="ltr">{order.customer_email || profile?.email}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Adresse aus Kundenkonto (Stripe-Lieferadresse ggf. in
                      Stripe-Dashboard)
                    </p>
                  </div>

                  {(order.status === "paid" || order.status === "refunded") && (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      disabled={downloading === order.id}
                      leadingIcon={<Download size={16} aria-hidden />}
                      onClick={() => void handleDownload(order)}
                    >
                      {downloading === order.id
                        ? "جاري إنشاء الفاتورة…"
                        : "تحميل الفاتورة PDF"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
