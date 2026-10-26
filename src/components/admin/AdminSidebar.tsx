"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ScrollText,
  Warehouse,
  ScanLine,
  Store,
  LogOut,
  Trash2,
  Wallet,
  Boxes,
  Globe2,
  Images,
  Settings2,
  PencilRuler,
  Inbox,
  Users,
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

  type NavItem = { href: string; icon: typeof Package; key: AdminMsgKey; adminOnly?: boolean };
  // Gruppiert nach Tagesgeschäft; Auswertungen und System-Funktionen stehen unten.
  // adminOnly entspricht ADMIN_ONLY_PREFIXES in der Middleware (Server prüft zusätzlich).
  const allGroups: { key: AdminMsgKey; items: NavItem[] }[] = [
    {
      key: "navOverview",
      items: [{ href: "/admin/dashboard", icon: LayoutDashboard, key: "dashboard" }],
    },
    {
      key: "navSales",
      items: [
        { href: "/admin/orders", icon: Inbox, key: "orders", adminOnly: true },
        { href: "/admin/pos", icon: ScanLine, key: "pos" },
      ],
    },
    {
      key: "navCatalog",
      items: [
        { href: "/admin/products", icon: Package, key: "products" },
        { href: "/admin/categories", icon: FolderTree, key: "categories" },
        { href: "/admin/inventory", icon: Warehouse, key: "inventory" },
      ],
    },
    {
      key: "navContent",
      items: [
        { href: "/admin/sliders", icon: Images, key: "sliders" },
        { href: "/admin/builder", icon: PencilRuler, key: "pageBuilder" },
        { href: "/admin/site", icon: Settings2, key: "siteSettings" },
      ],
    },
    {
      key: "navReports",
      items: [
        { href: "/admin/analytics/finance", icon: Wallet, key: "analyticsFinance", adminOnly: true },
        { href: "/admin/analytics/products", icon: Boxes, key: "analyticsProducts", adminOnly: true },
        { href: "/admin/analytics/traffic", icon: Globe2, key: "analyticsTraffic", adminOnly: true },
      ],
    },
    {
      key: "navSystem",
      items: [
        { href: "/admin/users", icon: Users, key: "users", adminOnly: true },
        { href: "/admin/activity", icon: ScrollText, key: "activity", adminOnly: true },
        { href: "/admin/trash", icon: Trash2, key: "trash" },
      ],
    },
  ];
  const groups = allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role === "admin" || !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0);

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
      <nav className="flex-1 p-3 sm:p-4 space-y-5 overflow-y-auto" aria-label={t("intern")}>
        {groups.map((group) => (
          <div key={group.key}>
            <p className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {t(group.key)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, key }) => {
                const active =
                  href === "/admin/dashboard"
                    ? pathname === "/admin" || pathname === "/admin/dashboard"
                    : pathname.startsWith(href);
                const className = `flex items-center gap-3 px-4 py-2.5 min-h-11 rounded-xl text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                  active
                    ? "bg-gold text-luxury-black font-medium"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`;
                const content = (
                  <>
                    <Icon size={18} aria-hidden />
                    {t(key)}
                  </>
                );
                return (
                  <li key={href}>
                    {/* Builder: harte Navigation, damit kein COEP von anderen Admin-Seiten kleben bleibt */}
                    {href === "/admin/builder" ? (
                      <a href={href} onClick={onNavigate} className={className} aria-current={active ? "page" : undefined}>
                        {content}
                      </a>
                    ) : (
                      <Link href={href} onClick={onNavigate} className={className} aria-current={active ? "page" : undefined}>
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
