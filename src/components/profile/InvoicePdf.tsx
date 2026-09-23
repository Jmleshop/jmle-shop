"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { Order } from "@/types";
import type { InvoiceProfile } from "@/lib/orders";
import {
  customerDisplayName,
  formatEuroDe,
  formatOrderDate,
  invoiceNumber,
  lineTotal,
} from "@/lib/orders";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#3B1408",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#FDBA74",
    paddingBottom: 16,
  },
  brand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#EA580C",
    letterSpacing: 4,
  },
  muted: { color: "#9A3412", fontSize: 9 },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    color: "#7C2D12",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    paddingBottom: 6,
    marginTop: 16,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#FFF7ED",
  },
  colName: { width: "48%" },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  totals: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: "45%",
  },
  totalStrong: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 6,
    color: "#EA580C",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9A3412",
    borderTopWidth: 0.5,
    borderTopColor: "#FED7AA",
    paddingTop: 8,
  },
});

function InvoiceDoc({
  order,
  profile,
}: {
  order: Order;
  profile: InvoiceProfile | null;
}) {
  const items = order.order_items ?? [];
  const inv = invoiceNumber(order);
  const name = customerDisplayName(profile, order.customer_email);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>jmle</Text>
            <Text style={styles.muted}>Arabische Feinkost · Coswig (Anhalt)</Text>
            <Text style={styles.muted}>info@jmle.de</Text>
          </View>
          <View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>
              Rechnung / Invoice
            </Text>
            <Text style={styles.muted}>{inv}</Text>
            <Text style={styles.muted}>{formatOrderDate(order.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.title}>Rechnungsempfänger</Text>
        <Text>{name}</Text>
        {profile?.street ? <Text>{profile.street}</Text> : null}
        <Text>{order.customer_email || profile?.email || ""}</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.colName}>Produkt</Text>
          <Text style={styles.colQty}>Menge</Text>
          <Text style={styles.colPrice}>Preis</Text>
          <Text style={styles.colTotal}>Summe</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colName}>{item.product_name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{formatEuroDe(Number(item.price))}</Text>
            <Text style={styles.colTotal}>{formatEuroDe(lineTotal(item))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.row}>
            <Text>Zwischensumme</Text>
            <Text>{formatEuroDe(Number(order.subtotal))}</Text>
          </View>
          {Number(order.discount_amount) > 0 && (
            <View style={styles.row}>
              <Text>
                Rabatt{order.discount_code ? ` (${order.discount_code})` : ""}
              </Text>
              <Text>−{formatEuroDe(Number(order.discount_amount))}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.totalStrong}>Gesamt inkl. MwSt.</Text>
            <Text style={styles.totalStrong}>
              {formatEuroDe(Number(order.total))}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          jmle · Alle Preise in EUR inkl. MwSt. · Diese Rechnung wurde
          elektronisch erstellt. Status: {order.status}
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadOrderInvoice(
  order: Order,
  profile: InvoiceProfile | null
) {
  const blob = await pdf(
    <InvoiceDoc order={order} profile={profile} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber(order)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
