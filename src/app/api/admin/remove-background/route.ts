import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  huggingfaceToken,
  removeBackgroundViaHuggingFace,
  toWebpCutout,
} from "@/lib/server-remove-background";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Server-Fallback für Freisteller — nur Hugging Face Inference.
 * Lokales @imgly/background-removal-node / onnxruntime-node (~700MB+)
 * wird bewusst NICHT deployed (Vercel Functions Storage Limit 10GB).
 * Primärpfad bleibt der Browser (WebGPU/WASM + CDN-Modelle).
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

  const token = huggingfaceToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Server-Freisteller nicht konfiguriert (HF_TOKEN). Bitte Browser-Freisteller nutzen.",
        code: "HF_TOKEN_MISSING",
      },
      { status: 503 }
    );
  }

  try {
    const png = await removeBackgroundViaHuggingFace(input, token);
    const webp = await toWebpCutout(png);
    return new NextResponse(new Uint8Array(webp), {
      headers: {
        "Content-Type": "image/webp",
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
