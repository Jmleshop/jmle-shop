import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { frameProductWebp } from "@/lib/reprocess-product-images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One Sharp trim + one WebP encode. Used by the editor so the stored file matches the batch. */
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
  const framed = await frameProductWebp(input);
  const output = framed ?? input;
  const changed = Boolean(framed);
  // WebP q90 mit Alpha — kompakt, optisch scharf, transparent
  return new NextResponse(new Uint8Array(output), {
    headers: {
      "Content-Type": changed
        ? "image/webp"
        : file.type || "application/octet-stream",
      "X-Frame-Changed": changed ? "1" : "0",
    },
  });
}
