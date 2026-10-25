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
