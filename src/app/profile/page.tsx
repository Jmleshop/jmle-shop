"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Order } from "@/types";
import OrderHistory from "@/components/profile/OrderHistory";
import type { InvoiceProfile } from "@/lib/orders";
import { Button } from "@/components/ui";
import { toast } from "@/components/AppToaster";

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<InvoiceProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, street, email")
        .eq("id", currentUser.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("[profile] orders:", orderError.message);
      } else {
        setOrders((orderData as Order[]) ?? []);
      }

      setLoading(false);
    }

    void loadProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-400 font-ui">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12 animate-fade-up">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-4 shadow-gold-sm">
          <User size={32} className="text-white" aria-hidden />
        </div>
        <h1 className="font-display text-2xl tracking-wide">
          {profile?.first_name} {profile?.last_name}
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-ui" dir="ltr">
          {user?.email}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200/50 p-5 shadow-sm mb-6 space-y-3">
        <h2 className="text-sm text-gold font-ui font-medium mb-2">
          معلومات الحساب
        </h2>
        <div className="flex justify-between text-sm font-ui">
          <span className="text-gray-500">الاسم</span>
          <span>{profile?.first_name || "—"}</span>
        </div>
        <div className="flex justify-between text-sm font-ui">
          <span className="text-gray-500">اسم العائلة</span>
          <span>{profile?.last_name || "—"}</span>
        </div>
        <div className="flex justify-between text-sm font-ui gap-4">
          <span className="text-gray-500 shrink-0">الشارع</span>
          <span className="text-end">{profile?.street || "—"}</span>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-display text-xl text-luxury-ink mb-3">
          طلباتي / Meine Bestellungen
        </h2>
        <OrderHistory orders={orders} profile={profile} />
      </section>

      <div className="space-y-3">
        <Link href="/cart" className="block">
          <Button variant="soft" fullWidth leadingIcon={<ShoppingBag size={18} />}>
            سلة التسوق
          </Button>
        </Link>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center justify-center gap-2 w-full min-h-12 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-ui hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} aria-hidden />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
