import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { AdminStats } from "@/types";

export async function GET() {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const service = createServiceClient();

  const [
    usersResult,
    ordersResult,
    productsResult,
    lowStockResult,
    discountsResult,
  ] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }),
    service
      .from("orders")
      .select("total, status")
      .eq("status", "paid"),
    service
      .from("shop_products")
      .select("id", { count: "exact", head: true }),
    service
      .from("shop_products")
      .select("id", { count: "exact", head: true })
      .lte("stock", 10),
    service
      .from("discount_codes")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const totalRevenue =
    ordersResult.data?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;

  const stats: AdminStats = {
    totalUsers: usersResult.count ?? 0,
    totalOrders: ordersResult.data?.length ?? 0,
    totalRevenue,
    totalProducts: productsResult.count ?? 0,
    lowStockProducts: lowStockResult.count ?? 0,
    activeDiscounts: discountsResult.count ?? 0,
  };

  return NextResponse.json({ stats });
}
