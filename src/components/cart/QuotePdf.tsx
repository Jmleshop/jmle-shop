"use client";

import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

import { formatEuroDe } from "@/lib/pricing";
import { lineGross, summarizeLines, type InquiryLine } from "@/lib/inquiry";
import { SHOP_PHONE_DISPLAY } from "@/lib/whatsapp-order";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#3B1408" },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#EA580C", letterSpacing: 4 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#FED7AA", paddingVertical: 4 },
  muted: { color: "#9A3412", fontSize: 9, marginTop: 2 },
});

let cairoReady = false;

/** Arabische Schrift aus /public/fonts (der frühere Tajawal-CDN-Link lieferte 404). */
function ensureCairo() {
  if (cairoReady || typeof window === "undefined") return;
  const origin = window.location.origin;
  Font.register({
    family: "Cairo",
    fonts: [
      { src: `${origin}/fonts/Cairo-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Cairo-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  cairoReady = true;
}

export async function downloadQuotePdf(input: {
  protocol: string;
  phone: string;
  lines: InquiryLine[];
  kind: "quote" | "invoice" | "delivery";
  invoiceNumber?: string | null;
  notes?: string | null;
  customer?: string;
  lang?: "ar" | "de";
}) {
  const totals = summarizeLines(input.lines);
  const ar = input.lang !== "de";
  const title =
    input.kind === "invoice"
      ? ar ? "فاتورة" : "Rechnung"
      : input.kind === "delivery"
        ? ar ? "عرض السعر وطلب التوصيل" : "Preisvorschlag & Lieferanfrage"
        : ar ? "عرض السعر وملخص الطلب" : "Preisvorschlag / Bestellübersicht";
  const align = ar ? "right" : "left";
  if (ar) ensureCairo();
  // Helvetica hat keine arabischen Zeichen — auf Arabisch durchgehend Cairo verwenden.
  const regular = ar ? { fontFamily: "Cairo" } : { fontFamily: "Helvetica" };
  const bold = ar ? { fontFamily: "Cairo", fontWeight: 700 as const } : { fontFamily: "Helvetica-Bold" };
  const doc = (
    <Document>
      <Page size="A4" style={{ ...styles.page, ...regular, textAlign: align }}>
        <Text style={[styles.brand, bold]}>jmle</Text>
        <Text style={styles.muted}>
          {ar
            ? `مأكولات عربية · كوزفيغ · ${SHOP_PHONE_DISPLAY} · info@jmle.de`
            : `Arabische Feinkost · Coswig (Anhalt) · ${SHOP_PHONE_DISPLAY} · info@jmle.de`}
        </Text>
        <Text style={[styles.title, bold]}>{title}</Text>
        <Text style={styles.muted}>
          {new Date().toLocaleDateString("de-DE")}
          {input.invoiceNumber ? ` · ${input.invoiceNumber}` : ""} · {ar ? "رقم" : "Vorgang"} {input.protocol}
        </Text>
        <Text style={styles.muted}>
          {input.customer ? `${input.customer} · ` : ""}{ar ? "هاتف" : "Tel."} {input.phone}
        </Text>
        <View style={[styles.row, { marginTop: 16 }]}>
          <Text style={{ width: "50%" }}>{ar ? "الصنف" : "Position"}</Text>
          <Text style={{ width: "15%", textAlign: "right" }}>{ar ? "الكمية" : "Menge"}</Text>
          <Text style={{ width: "35%", textAlign: "right" }}>{ar ? "المبلغ" : "Betrag"}</Text>
        </View>
        {input.lines.map((line) => (
          <View key={`${line.productId}-${line.name}`} style={styles.row}>
            <Text style={{ width: "50%" }}>{line.name}</Text>
            <Text style={{ width: "15%", textAlign: "right" }}>{line.quantity}</Text>
            <Text style={{ width: "35%", textAlign: "right" }}>{formatEuroDe(lineGross(line))}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 12 }}>{ar ? "المجموع الفرعي" : "Zwischensumme"} {formatEuroDe(totals.subtotal)}</Text>
        <Text>{ar ? "ضريبة القيمة المضافة" : "darin MwSt."} {formatEuroDe(totals.vat)}</Text>
        <Text style={[bold, { marginTop: 4 }]}>{ar ? "الإجمالي" : "Gesamt"} {formatEuroDe(totals.total)}</Text>
        {input.notes ? <Text style={[styles.muted, { marginTop: 12 }]}>{ar ? "ملاحظة" : "Anmerkung"}: {input.notes}</Text> : null}
        <Text style={[styles.muted, { marginTop: 24 }]}>
          {input.kind === "invoice"
            ? ar
              ? "الرقم الضريبي DE123456789 · jmle، Musterstraße 1، 06869 Coswig"
              : "USt-IdNr. DE123456789 · jmle, Musterstraße 1, 06869 Coswig (Anhalt)"
            : ar
              ? "هذا ليس فاتورة، بل ملخص طلب غير ملزم."
              : "Dies ist keine Rechnung, sondern eine unverbindliche Bestellübersicht."}
        </Text>
      </Page>
    </Document>
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    input.kind === "invoice"
      ? `${input.invoiceNumber || "rechnung"}.pdf`
      : input.kind === "delivery"
        ? "lieferanfrage-jmle.pdf"
        : "preisvorschlag-jmle.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
