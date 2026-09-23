"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
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

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} className="text-jmle-yellow" />
        </div>
        <h1 className="text-2xl font-light tracking-wide">
          {profile?.first_name} {profile?.last_name}
        </h1>
        <p className="text-gray-500 text-sm mt-1" dir="ltr">
          {user?.email}
        </p>
      </div>

      <div className="bg-white p-6 shadow-sm mb-6 space-y-3">
        <h2 className="text-sm text-gold font-medium mb-3">معلومات الحساب</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">الاسم</span>
          <span>{profile?.first_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">اسم العائلة</span>
          <span>{profile?.last_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">الشارع</span>
          <span>{profile?.street}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/cart"
          className="flex items-center gap-3 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <Package size={20} className="text-gold" />
          <span className="text-sm">سلة التسوق</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 bg-white p-4 shadow-sm hover:shadow-md transition-shadow w-full text-red-500"
        >
          <LogOut size={20} />
          <span className="text-sm">تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
