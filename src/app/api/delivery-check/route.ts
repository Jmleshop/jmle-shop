import { NextResponse } from "next/server";
import { checkDeliveryArea } from "@/lib/delivery-area";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  return NextResponse.json(await checkDeliveryArea(q));
}
