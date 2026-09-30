/**
 * Masken-Reparatur nach KI-Freistellung.
 *
 * IMG.LY schreibt nur Alpha — RGB bleibt. Weiße/helle Verpackungsflächen und
 * Logos werden oft als Hintergrund gewertet → Löcher und schwebende Teile.
 *
 * Pipeline:
 * 1) Kern-Silhouette (hohe Deckung)
 * 2) Morphologisches Closing (Lücken schließen)
 * 3) Lochfüllung (Innenflächen wiederherstellen)
 * 4) Soft-Halo / Studio-Matte außerhalb der Silhouette entfernen
 * 5) RGB bei a=0 nullen (kein WebP-Farbrest)
 */

/**
 * Kern-Silhouette: Alpha darüber zählt als Produktstruktur.
 * Niedriger als früher, damit weiche Verpackungsflächen nicht als Löcher bleiben.
 */
export const MASK_CORE_ALPHA = 56;
/** Weiche Kanten unter diesem Wert außerhalb der Silhouette → transparent. */
export const MASK_SOFT_KILL = 28;
/** Closing-Radius in Pixeln — verbindet Logos mit der Verpackung. */
export const MASK_CLOSE_RADIUS = 5;

export function isStudioMattePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < MASK_SOFT_KILL) return true;
  if (a >= 250) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  // Fast weiß, Cream (#FFF7ED), helles Grau — typische Studio-/Karten-Matte
  if (min >= 230 && chroma <= 28) return true;
  if (min >= 210 && chroma <= 18 && a < 200) return true;
  // Sehr hell + mittel-transparent = Residual-Matte
  if (min >= 200 && chroma <= 40 && a < 140) return true;
  return false;
}

function dilateBinary(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src;
  let cur = src;
  for (let step = 0; step < radius; step++) {
    const next = new Uint8Array(cur.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (cur[i]) {
          next[i] = 1;
          continue;
        }
        let hit = 0;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            if (cur[yy * width + xx]) {
              hit = 1;
              break;
            }
          }
        }
        next[i] = hit;
      }
    }
    cur = next;
  }
  return cur;
}

function erodeBinary(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src;
  let cur = src;
  for (let step = 0; step < radius; step++) {
    const next = new Uint8Array(cur.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!cur[i]) {
          next[i] = 0;
          continue;
        }
        let keep = 1;
        for (let dy = -1; dy <= 1 && keep; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) {
            keep = 0;
            break;
          }
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width || !cur[yy * width + xx]) {
              keep = 0;
              break;
            }
          }
        }
        next[i] = keep;
      }
    }
    cur = next;
  }
  return cur;
}

/** Flood-fill von den Bildrändern: markiert Außen-Hintergrund. */
function markExterior(mask: Uint8Array, width: number, height: number): Uint8Array {
  const exterior = new Uint8Array(mask.length);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (mask[i] || exterior[i]) return;
    exterior[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  return exterior;
}

function fillHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const exterior = markExterior(mask, width, height);
  const filled = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    // Alles was nicht vom Rand aus erreichbar ist, gehört zur Silhouette
    filled[i] = mask[i] || !exterior[i] ? 1 : 0;
  }
  return filled;
}

/**
 * Repariert Alpha in-place auf RGBA-Pixeldaten.
 * Stellt Produktlöcher wieder her und entfernt Studio-Matte außerhalb.
 */
export function repairCutoutMask(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options?: { closeRadius?: number }
): void {
  const closeRadius = options?.closeRadius ?? MASK_CLOSE_RADIUS;
  const n = width * height;
  if (n <= 0) return;

  const core = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const a = data[i + 3];
    if (a < MASK_CORE_ALPHA) {
      core[p] = 0;
      continue;
    }
    // Reine Studio-Matte mit schwachem Alpha zählt nicht als Produktkern
    if (isStudioMattePixel(data[i], data[i + 1], data[i + 2], a) && a < 180) {
      core[p] = 0;
      continue;
    }
    core[p] = 1;
  }

  // Echte Innenlöcher (z. B. herausgestanzte Logos) — ohne Dilate
  const holed = fillHoles(core, width, height);

  // Morphologisches Closing verbindet getrennte Produktteile / Logos
  const dilated = dilateBinary(holed, width, height, closeRadius);
  const closed = fillHoles(dilated, width, height);
  const bridged = fillHoles(
    erodeBinary(closed, width, height, Math.max(0, closeRadius - 1)),
    width,
    height
  );

  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const matte = isStudioMattePixel(r, g, b, a);

    if (holed[p]) {
      // Kern + echte Löcher: Produkt unversehrt wiederherstellen (auch helle Verpackung)
      data[i + 3] = 255;
      continue;
    }

    if (bridged[p]) {
      // Nur durch Dilate erreicht: farbige Produktbrücken behalten —
      // Studio-Matte (Cream/Weiß/Grau) niemals zu einem Kasten aufblasen
      if (!matte && a >= MASK_SOFT_KILL) {
        data[i + 3] = 255;
        continue;
      }
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }

    // Außerhalb der Silhouette: Matte/Halo hart entfernen
    if (matte || a < 220) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  // Transparent → RGB 0 (kein Farbrauschen in WebP)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }
}

/**
 * Bounding-Box aus der reparierten, deckenden Silhouette.
 * Verwendet hohe Alpha-Schwelle, damit Soft-Halos den Kasten nicht aufblasen.
 */
export function opaqueCoreBounds(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  alphaCut = 128
): { x: number; y: number; w: number; h: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const a = data[(row + x) * 4 + 3];
      if (a < alphaCut) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Kleiner fester Feather-Rand um die Kern-Box (nicht % der Canvas-Größe). */
export function expandBoxByPixels(
  box: { x: number; y: number; w: number; h: number },
  width: number,
  height: number,
  padPx: number
): { x: number; y: number; w: number; h: number } {
  const pad = Math.max(1, Math.round(padPx));
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const right = Math.min(width, box.x + box.w + pad);
  const bottom = Math.min(height, box.y + box.h + pad);
  return { x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y) };
}
