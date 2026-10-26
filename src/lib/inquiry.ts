export type InquiryChannel = "whatsapp" | "callback" | "delivery";
export type InquiryStatus = "open" | "done";

export type InquiryLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export type Inquiry = {
  id: string;
  channel: InquiryChannel;
  status: InquiryStatus;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  email: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  items: InquiryLine[];
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  invoice_status: "draft" | "issued";
  invoice_number: string | null;
  invoice_issued_at: string | null;
  created_at: string;
};

export function lineGross(line: InquiryLine) {
  return Math.round(line.unitPrice * line.quantity * 100) / 100;
}

export function summarizeLines(lines: InquiryLine[]) {
  const subtotal = Math.round(lines.reduce((sum, line) => sum + lineGross(line), 0) * 100) / 100;
  const vat = Math.round(
    lines.reduce((sum, line) => {
      const gross = lineGross(line);
      const rate = line.vatRate > 0 ? line.vatRate : 19;
      return sum + (gross - gross / (1 + rate / 100));
    }, 0) * 100
  ) / 100;
  return { subtotal, vat, total: subtotal };
}

/**
 * Rechnungszeilen aus dem Admin-Editor serverseitig bereinigen: ungültige Zeilen verwerfen,
 * Mengen auf 1–9999 begrenzen, Preise ≥ 0 auf Cent runden, MwSt. nur 0/7/19 %.
 * Gibt null zurück, wenn `raw` kein Array ist.
 */
export function sanitizeInquiryLines(raw: unknown): InquiryLine[] | null {
  if (!Array.isArray(raw)) return null;
  const lines: InquiryLine[] = [];
  for (const entry of raw.slice(0, 200)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId.slice(0, 100) : "";
    const name = typeof row.name === "string" ? row.name.trim().slice(0, 200) : "";
    const quantity = Math.trunc(Number(row.quantity));
    const unitPrice = Number(row.unitPrice);
    const vatRate = Number(row.vatRate);
    if (!name || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }
    lines.push({
      productId,
      name,
      quantity: Math.min(quantity, 9999),
      unitPrice: Math.round(unitPrice * 100) / 100,
      vatRate: [0, 7, 19].includes(vatRate) ? vatRate : 19,
    });
  }
  return lines;
}
