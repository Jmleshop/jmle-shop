import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Ultra-schneller Server-Fallback für Freisteller.
 * Primary: @imgly/background-removal-node (small ONNX)
 * Optional: Hugging Face Inference (briaai/RMBG-1.4) wenn HF_TOKEN gesetzt.
 */
export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!input.length) {
    return NextResponse.json({ error: "Leere Datei" }, { status: 400 });
  }

  try {
    const png = await removeWithNode(input);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "X-Bg-Engine": "imgly-node-small",
        "Cache-Control": "no-store",
      },
    });
  } catch (nodeErr) {
    console.warn("[api/remove-background] node engine failed", nodeErr);
    const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error:
            nodeErr instanceof Error
              ? nodeErr.message
              : "Server-Freisteller fehlgeschlagen",
        },
        { status: 500 }
      );
    }
    try {
      const png = await removeWithHuggingFace(input, token);
      return new NextResponse(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "X-Bg-Engine": "hf-rmbg-1.4",
          "Cache-Control": "no-store",
        },
      });
    } catch (hfErr) {
      console.error("[api/remove-background] hf failed", hfErr);
      return NextResponse.json(
        {
          error:
            hfErr instanceof Error
              ? hfErr.message
              : "Hugging-Face-Freisteller fehlgeschlagen",
        },
        { status: 500 }
      );
    }
  }
}

async function removeWithNode(input: Buffer): Promise<Buffer> {
  const { removeBackground } = await import("@imgly/background-removal-node");
  // Mime-typisierter Blob — die Node-Lib lehnt Buffer ohne type ab
  const source = new Blob([new Uint8Array(input)], { type: "image/png" });
  const blob = await removeBackground(source, {
    model: "small",
    output: {
      format: "image/png",
      quality: 0.92,
    },
  });
  const ab = await blob.arrayBuffer();
  const out = Buffer.from(ab);
  if (!(await pngHasTransparency(out))) {
    throw new Error("Node-Freisteller ohne Alpha-Kanal");
  }
  return out;
}

async function removeWithHuggingFace(input: Buffer, token: string): Promise<Buffer> {
  const res = await fetch("https://api-inference.huggingface.co/models/briaai/RMBG-1.4", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      Accept: "image/png",
    },
    body: new Uint8Array(input),
  });
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

/** Pixelgenaue Transparenz-Prüfung via Sharp (Indexed-PNG + tRNS inklusive) */
async function pngHasTransparency(buf: Buffer): Promise<boolean> {
  const sharp = (await import("sharp")).default;
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
  // Mindestens 2 % Freisteller-Fläche und etwas deckendes Produkt (≥0.2 %)
  return nonOpaque / total >= 0.02 && solid / total >= 0.002;
}
