import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { optimizeProductImageBuffer } from "@/lib/optimize-product-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Zero-Click Server-Pipeline: Freisteller + Trim + 1:1-Zentrierung */
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

  const removeBackground = String(form.get("removeBackground") ?? "1") !== "0";
  const maxEdgeRaw = Number(form.get("maxEdge"));
  const maxEdge =
    Number.isFinite(maxEdgeRaw) && maxEdgeRaw >= 256 && maxEdgeRaw <= 4096
      ? Math.round(maxEdgeRaw)
      : undefined;

  try {
    const result = await optimizeProductImageBuffer(input, {
      removeBackground,
      force: true,
      maxEdge,
    });
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "X-Bg-Removed": result.removedBackground ? "1" : "0",
        "X-Reframed": result.reframed ? "1" : "0",
        "X-Image-Size": `${result.width}x${result.height}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[optimize-product-image]", cause);
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : "Optimierung fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
