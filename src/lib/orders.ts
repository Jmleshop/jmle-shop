import { formatEuroDe } from "@/lib/pricing";
import type { Order, OrderItem } from "@/types";

export type InvoiceProfile = {
  first_name?: string | null;
  last_name?: string | null;
  street?: string | null;
  email?: string | null;
};

export function orderStatusLabel(status: Order["status"]): {
  ar: string;
  de: string;
  tone: "success" | "warning" | "neutral" | "danger";
} {
  switch (status) {
    case "paid":
      return { ar: "مدفوعة", de: "Bezahlt", tone: "success" };
    case "pending":
      return { ar: "قيد المعالجة", de: "In Bearbeitung", tone: "warning" };
    case "cancelled":
      return { ar: "ملغاة", de: "Storniert", tone: "danger" };
    case "refunded":
      return { ar: "مستردة", de: "Erstattet", tone: "neutral" };
    default:
      return { ar: status, de: status, tone: "neutral" };
  }
}

/** Kurz-ID für Rechnungsnummer */
export function invoiceNumber(order: Order): string {
  const short = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const d = new Date(order.created_at);
  const y = d.getFullYear();
  return `JMLE-${y}-${short}`;
}

export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function customerDisplayName(profile: InvoiceProfile | null, email?: string | null) {
  const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return email || profile?.email || "Kunde";
}

export function lineTotal(item: OrderItem): number {
  return Number(item.price) * Number(item.quantity);
}

export { formatEuroDe };
