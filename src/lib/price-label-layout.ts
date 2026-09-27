/** A4 in PDF points. Each label is a fixed box that never crosses a page. */
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

export const LABEL_LAYOUT = {
  margin: 28,
  cols: 3,
  rows: 5,
  gap: 8,
} as const;

function floor2(value: number) {
  return Math.floor(value * 100) / 100;
}

export function labelCellSize() {
  const { margin, cols, rows, gap } = LABEL_LAYOUT;
  const innerW = A4_WIDTH - margin * 2;
  const innerH = A4_HEIGHT - margin * 2;
  const labelW = (innerW - gap * (cols - 1)) / cols;
  const labelH = innerH / rows - gap;
  return {
    labelW: floor2(labelW),
    labelH: floor2(labelH),
    perPage: cols * rows,
  };
}

/** True when the full grid, including the last row gap, stays inside A4. */
export function labelGridFits() {
  const { margin, cols, rows, gap } = LABEL_LAYOUT;
  const { labelW, labelH } = labelCellSize();
  const usedW = margin * 2 + cols * labelW + (cols - 1) * gap;
  const usedH = margin * 2 + rows * labelH + rows * gap;
  return (
    labelW > 80 &&
    labelH > 80 &&
    usedW <= A4_WIDTH + 0.02 &&
    usedH <= A4_HEIGHT + 0.02
  );
}

export function chunkLabels<T>(items: readonly T[]): T[][] {
  const { perPage } = labelCellSize();
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += perPage) {
    pages.push(items.slice(index, index + perPage));
  }
  return pages;
}

export function rowsOnPage<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += LABEL_LAYOUT.cols) {
    rows.push(items.slice(index, index + LABEL_LAYOUT.cols));
  }
  return rows;
}
