"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ScrollText,
  Warehouse,
  Store,
  LogOut,
  Trash2,
  Wallet,
  Boxes,
  Globe2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StaffRole } from "@/types";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import type { AdminMsgKey } from "@/lib/admin-i18n";

export default function AdminSidebar({
  role,
  displayName,
  onNavigate,
}: {
  role: StaffRole;
  displayName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t, lang, setLang } = useAdminI18n();

  const staffItems: { href: string; icon: typeof Package; key: AdminMsgKey }[] = [
    { href: "/admin/dashboard", icon: LayoutDashboard, key: "dashboard" },
    { href: "/admin/products", icon: Package, key: "products" },
    { href: "/admin/categories", icon: FolderTree, key: "categories" },
    { href: "/admin/inventory", icon: Warehouse, key: "inventory" },
    { href: "/admin/trash", icon: Trash2, key: "trash" },
  ];
  const adminItems: { href: string; icon: typeof Package; key: AdminMsgKey }[] = [
    { href: "/admin/analytics/finance", icon: Wallet, key: "analyticsFinance" },
    { href: "/admin/analytics/products", icon: Boxes, key: "analyticsProducts" },
    { href: "/admin/analytics/traffic", icon: Globe2, key: "analyticsTraffic" },
    { href: "/admin/activity", icon: ScrollText, key: "activity" },
  ];
  const items = role === "admin" ? [...staffItems, ...adminItems] : staffItems;

  return (
    <aside className="w-64 h-full bg-luxury-black text-white flex flex-col shrink-0">
      <div className="p-5 sm:p-6 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{t("intern")}</h1>
            <p className="text-xs text-gray-400 mt-1">{t("staffArea")}</p>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "de" ? "ar" : "de")}
            className="text-[10px] uppercase border border-white/20 rounded-lg px-2 py-2 min-h-10 hover:bg-white/10"
            title={t("language")}
          >
            {lang === "de" ? "AR" : "DE"}
          </button>
        </div>
        {displayName && (
          <p className="text-xs text-gold mt-2 truncate">{displayName}</p>
        )}
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">
          {role === "admin" ? t("admin") : t("employee")}
        </p>
      </div>
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {items.map(({ href, icon: Icon, key }) => {
          const active =
            href === "/admin/dashboard"
              ? pathname === "/admin" || pathname === "/admin/dashboard"
              : href.startsWith("/admin/analytics")
                ? pathname.startsWith(href)
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3.5 min-h-12 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-gold text-luxury-black font-medium"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 sm:p-4 border-t border-white/10 space-y-1">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3.5 min-h-12 rounded-xl text-sm text-gray-300 hover:bg-white/10"
        >
          <Store size={18} />
          {t("shop")}
        </Link>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/admin/login");
            router.refresh();
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 min-h-12 rounded-xl text-sm text-gray-300 hover:bg-white/10"
        >
          <LogOut size={18} />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
}
