import { NextResponse } from "next/server";
import { placesForPostalCode } from "@/lib/delivery-area";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  return NextResponse.json(await placesForPostalCode(code), {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
