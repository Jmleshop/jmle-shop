import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import {
  A4_HEIGHT,
  A4_WIDTH,
  LABEL_LAYOUT,
  chunkLabels,
  labelCellSize,
  labelGridFits,
  rowsOnPage,
} from "./price-label-layout";

function countPdfPages(bytes: Buffer) {
  const text = bytes.toString("latin1");
  return (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

async function pdfBytes(element: React.ReactElement): Promise<Buffer> {
  const { pdf } = await import("@react-pdf/renderer");
  const result = await pdf(element as Parameters<typeof pdf>[0]).toBuffer();
  if (Buffer.isBuffer(result)) return result;
  if (result instanceof Uint8Array) return Buffer.from(result);
  const chunks: Buffer[] = [];
  for await (const chunk of result as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe("price label pagination", () => {
  it("fits every cell inside the A4 content box", () => {
    assert.equal(labelGridFits(), true);
    const { labelW, labelH, perPage } = labelCellSize();
    assert.equal(perPage, LABEL_LAYOUT.cols * LABEL_LAYOUT.rows);
    const { margin, cols, rows, gap } = LABEL_LAYOUT;
    const usedW = margin * 2 + cols * labelW + (cols - 1) * gap;
    const usedH = margin * 2 + rows * labelH + rows * gap;
    assert.ok(usedW <= A4_WIDTH + 0.02);
    assert.ok(usedH <= A4_HEIGHT + 0.02);
  });

  it("moves a label that does not fit onto the next page as a whole", () => {
    const { perPage } = labelCellSize();
    const pages = chunkLabels(Array.from({ length: perPage + 1 }, (_, index) => index));
    assert.equal(pages.length, 2);
    assert.equal(pages[0].length, perPage);
    assert.deepEqual(pages[1], [perPage]);
    assert.equal(rowsOnPage(pages[0]).length, LABEL_LAYOUT.rows);
    assert.equal(rowsOnPage(pages[1]).length, 1);
    const seen = new Set<number>();
    for (const page of pages) {
      for (const id of page) {
        assert.equal(seen.has(id), false);
        seen.add(id);
      }
    }
  });

  it("renders one PDF page per full grid", async () => {
    const { Document, Page, View } = await import("@react-pdf/renderer");
    const { labelW, labelH, perPage } = labelCellSize();
    const pages = chunkLabels(Array.from({ length: perPage + 3 }, (_, index) => index));
    const doc = React.createElement(
      Document,
      null,
      pages.map((pageItems, pageIndex) =>
        React.createElement(
          Page,
          {
            key: pageIndex,
            size: "A4",
            wrap: false,
            style: {
              padding: LABEL_LAYOUT.margin,
              flexDirection: "column",
            },
          },
          rowsOnPage(pageItems).map((row, rowIndex) =>
            React.createElement(
              View,
              {
                key: rowIndex,
                wrap: false,
                style: {
                  flexDirection: "row" as const,
                  height: labelH,
                  marginBottom: LABEL_LAYOUT.gap,
                },
              },
              row.map((id, index) =>
                React.createElement(View, {
                  key: id,
                  wrap: false,
                  style: {
                    width: labelW,
                    height: labelH,
                    marginRight: index < row.length - 1 ? LABEL_LAYOUT.gap : 0,
                    borderWidth: 1,
                  },
                })
              )
            )
          )
        )
      )
    );
    const bytes = await pdfBytes(doc);
    assert.ok(bytes.length > 500);
    assert.equal(countPdfPages(bytes), pages.length);
  });
});
