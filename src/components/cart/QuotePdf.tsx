"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatEuroDe } from "@/lib/pricing";
import { lineGross, summarizeLines, type InquiryLine } from "@/lib/inquiry";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#3B1408" },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#EA580C", letterSpacing: 4 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#FED7AA", paddingVertical: 4 },
  muted: { color: "#9A3412", fontSize: 9, marginTop: 2 },
});

export async function downloadQuotePdf(input: {
  protocol: string;
  phone: string;
  lines: InquiryLine[];
  kind: "quote" | "invoice";
  invoiceNumber?: string | null;
  notes?: string | null;
  customer?: string;
}) {
  const totals = summarizeLines(input.lines);
  const title = input.kind === "invoice" ? "Rechnung" : "Preisvorschlag / Bestellübersicht";
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>jmle</Text>
        <Text style={styles.muted}>Arabische Feinkost · Coswig (Anhalt) · info@jmle.de</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>
          {new Date().toLocaleDateString("de-DE")}
          {input.invoiceNumber ? ` · ${input.invoiceNumber}` : ""} · Vorgang {input.protocol}
        </Text>
        <Text style={styles.muted}>
          {input.customer ? `${input.customer} · ` : ""}Tel. {input.phone}
        </Text>
        <View style={[styles.row, { marginTop: 16 }]}>
          <Text style={{ width: "50%" }}>Position</Text>
          <Text style={{ width: "15%", textAlign: "right" }}>Menge</Text>
          <Text style={{ width: "35%", textAlign: "right" }}>Betrag</Text>
        </View>
        {input.lines.map((line) => (
          <View key={`${line.productId}-${line.name}`} style={styles.row}>
            <Text style={{ width: "50%" }}>{line.name}</Text>
            <Text style={{ width: "15%", textAlign: "right" }}>{line.quantity}</Text>
            <Text style={{ width: "35%", textAlign: "right" }}>{formatEuroDe(lineGross(line))}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 12 }}>Zwischensumme {formatEuroDe(totals.subtotal)}</Text>
        <Text>darin MwSt. {formatEuroDe(totals.vat)}</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 4 }}>Gesamt {formatEuroDe(totals.total)}</Text>
        {input.notes ? <Text style={[styles.muted, { marginTop: 12 }]}>Anmerkung: {input.notes}</Text> : null}
        <Text style={[styles.muted, { marginTop: 24 }]}>
          {input.kind === "invoice"
            ? "USt-IdNr. DE123456789 · jmle, Musterstraße 1, 06869 Coswig (Anhalt)"
            : "Dies ist keine Rechnung, sondern eine unverbindliche Bestellübersicht."}
        </Text>
      </Page>
    </Document>
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = input.kind === "invoice" ? `${input.invoiceNumber || "rechnung"}.pdf` : "preisvorschlag-jmle.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
