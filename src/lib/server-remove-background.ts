/**
 * Server-side background removal WITHOUT local ONNX/WASM.
 * Uses Hugging Face Inference API so Vercel Functions Storage stays small
 * (onnxruntime-node alone is ~600MB and blew past the 10GB deploy limit).
 */

import sharp from "sharp";

export async function removeBackgroundViaHuggingFace(
  input: Buffer,
  token: string
): Promise<Buffer> {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        Accept: "image/png",
      },
      body: new Uint8Array(input),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HF ${res.status}: ${text.slice(0, 200)}`);
  }
  const out = Buffer.from(await res.arrayBuffer());
  if (!(await pngHasTransparency(out))) {
    throw new Error("HF-Ergebnis ohne Alpha-Kanal");
  }
  return out;
}

export function huggingfaceToken(): string | null {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN;
  return token?.trim() || null;
}

/** Pixelgenaue Transparenz-Prüfung via Sharp */
export async function pngHasTransparency(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = Math.max(1, info.width * info.height);
  let nonOpaque = 0;
  let solid = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < 250) nonOpaque += 1;
    else solid += 1;
  }
  return nonOpaque / total >= 0.02 && solid / total >= 0.002;
}

export async function toWebpCutout(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .ensureAlpha()
    .webp({ quality: 85, alphaQuality: 90, effort: 4 })
    .toBuffer();
}
