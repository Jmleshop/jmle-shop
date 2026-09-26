"use client";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { formatEuroDe } from "@/lib/pricing";
import { formatBasePriceLabel } from "@/lib/calculateBasePrice";
import type { FoodProduct } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 18, flexDirection: "row", flexWrap: "wrap" },
  label: {
    width: "32%",
    height: 120,
    borderWidth: 1,
    borderColor: "#111827",
    margin: "0.6%",
    padding: 8,
    justifyContent: "space-between",
  },
  brand: { fontSize: 8, color: "#EA580C" },
  name: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  price: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8, color: "#374151" },
});

function LabelsDoc({ products }: { products: FoodProduct[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {products.map((product) => {
          const unit = formatBasePriceLabel(
            Number(product.price),
            product.weight_value,
            product.weight_unit,
            false
          );
          return (
            <View key={product.id} style={styles.label}>
              <Text style={styles.brand}>jmle</Text>
              <Text style={styles.name}>{product.name_de || product.name_ar}</Text>
              <Text style={styles.price}>{formatEuroDe(Number(product.price))}</Text>
              <Text style={styles.meta}>
                {unit || "inkl. MwSt."} · {product.vat_rate}% MwSt.
              </Text>
              <Text style={styles.meta}>
                {product.barcode || product.product_number || ""}
              </Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function downloadPriceLabels(products: FoodProduct[]) {
  if (!products.length) return;
  const blob = await pdf(<LabelsDoc products={products} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "preisschilder.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
