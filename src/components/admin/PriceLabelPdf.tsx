"use client";

import {
  Document,
  Font,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { formatEuroDe } from "@/lib/pricing";
import { formatBasePriceLabel } from "@/lib/calculateBasePrice";
import type { FoodProduct } from "@/types";

let fontsReady = false;

function ensureArabicFont() {
  if (fontsReady || typeof window === "undefined") return;
  const origin = window.location.origin;
  Font.register({
    family: "Cairo",
    fonts: [
      { src: `${origin}/fonts/Cairo-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Cairo-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    fontFamily: "Cairo",
  },
  label: {
    width: "32%",
    height: 132,
    borderWidth: 1,
    borderColor: "#111827",
    margin: "0.6%",
    padding: 8,
    justifyContent: "space-between",
  },
  brand: { fontSize: 8, color: "#EA580C", fontFamily: "Helvetica" },
  nameAr: {
    fontSize: 11,
    fontFamily: "Cairo",
    fontWeight: 700,
    textAlign: "right",
  },
  nameDe: { fontSize: 9, fontFamily: "Helvetica", textAlign: "left" },
  price: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8, color: "#374151", fontFamily: "Helvetica" },
});

function rtl(text: string) {
  return `\u200F${text}`;
}

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
          const arabic = (product.name_ar || "").trim();
          const german = (product.name_de || "").trim();
          return (
            <View key={product.id} style={styles.label}>
              <Text style={styles.brand}>jmle</Text>
              {arabic ? <Text style={styles.nameAr}>{rtl(arabic)}</Text> : null}
              {german ? <Text style={styles.nameDe}>{german}</Text> : null}
              {!arabic && !german ? <Text style={styles.nameDe}>{product.id}</Text> : null}
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
  ensureArabicFont();
  const blob = await pdf(<LabelsDoc products={products} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "preisschilder.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
