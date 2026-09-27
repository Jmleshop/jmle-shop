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
import {
  LABEL_LAYOUT,
  chunkLabels,
  labelCellSize,
  rowsOnPage,
} from "@/lib/price-label-layout";
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

const { labelW, labelH } = labelCellSize();

/** react-pdf has no page-break-inside property; wrap={false} is that rule. */
const keepTogether = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
} as const;

const styles = StyleSheet.create({
  page: {
    padding: LABEL_LAYOUT.margin,
    flexDirection: "column",
    fontFamily: "Cairo",
  },
  row: {
    flexDirection: "row",
    height: labelH,
    marginBottom: LABEL_LAYOUT.gap,
  },
  label: {
    width: labelW,
    height: labelH,
    borderWidth: 1,
    borderColor: "#111827",
    padding: 8,
    justifyContent: "space-between",
    overflow: "hidden",
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

function clipLabel(text: string, max = 72) {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function Label({ product }: { product: FoodProduct }) {
  const unit = formatBasePriceLabel(
    Number(product.price),
    product.weight_value,
    product.weight_unit,
    false
  );
  const arabic = clipLabel(product.name_ar || "");
  const german = clipLabel(product.name_de || "");
  return (
    <View wrap={false} style={{ ...styles.label, ...keepTogether } as typeof styles.label}>
      <Text style={styles.brand}>jmle</Text>
      {arabic ? <Text style={styles.nameAr}>{rtl(arabic)}</Text> : null}
      {german ? <Text style={styles.nameDe}>{german}</Text> : null}
      {!arabic && !german ? <Text style={styles.nameDe}>{product.id}</Text> : null}
      <Text style={styles.price}>{formatEuroDe(Number(product.price))}</Text>
      <Text style={styles.meta}>
        {unit || "inkl. MwSt."} · {product.vat_rate}% MwSt.
      </Text>
      <Text style={styles.meta}>{product.barcode || product.product_number || ""}</Text>
    </View>
  );
}

function LabelsDoc({ products }: { products: FoodProduct[] }) {
  const pages = chunkLabels(products);
  return (
    <Document>
      {pages.map((pageProducts, pageIndex) => (
        <Page key={pageIndex} size="A4" wrap={false} style={styles.page}>
          {rowsOnPage(pageProducts).map((row, rowIndex) => (
            <View
              key={rowIndex}
              wrap={false}
              style={{ ...styles.row, ...keepTogether } as typeof styles.row}
            >
              {row.map((product, index) => (
                <View
                  key={product.id}
                  wrap={false}
                  style={{
                    marginRight: index < row.length - 1 ? LABEL_LAYOUT.gap : 0,
                  }}
                >
                  <Label product={product} />
                </View>
              ))}
            </View>
          ))}
        </Page>
      ))}
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
