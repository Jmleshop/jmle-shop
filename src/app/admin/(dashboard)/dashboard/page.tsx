"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderTree, Package } from "lucide-react";

export default function AdminDashboardPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [counts, setCounts] = useState({ products: 0, categories: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/me").then((r) => r.json()),
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ])
      .then(([me, products, categories]) => {
        const profile = me.profile ?? {};
        setName(
          profile.full_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            me.user?.email ||
            ""
        );
        setRole(me.role || profile.role || "");
        const allProducts = products.products ?? [];
        const published = allProducts.filter(
          (p: { status?: string; deleted_at?: string | null }) =>
            !p.deleted_at && (p.status ?? "published") !== "draft"
        );
        const drafts = allProducts.filter(
          (p: { status?: string; deleted_at?: string | null }) =>
            !p.deleted_at && p.status === "draft"
        );
        setCounts({
          products: published.length,
          categories: (categories.categories ?? []).length,
          drafts: drafts.length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Lade Dashboard...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">
        Willkommen{name ? `, ${name}` : ""}
      </h1>
      <p className="text-sm mb-8">
        Eingeloggt als:{" "}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold/15 text-luxury-black font-medium">
          {role || "unbekannt"}
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/products"
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-gold/40 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Aktive Produkte</p>
              <p className="text-2xl font-semibold">{counts.products}</p>
            </div>
            <div className="p-3 rounded-xl bg-jmle-warm text-gold-dark">
              <Package size={22} />
            </div>
          </div>
        </Link>
        <Link
          href="/admin/products"
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-gold/40 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Entwürfe</p>
              <p className="text-2xl font-semibold">{counts.drafts}</p>
            </div>
            <div className="p-3 rounded-xl bg-jmle-warm text-gold-dark">
              <Package size={22} />
            </div>
          </div>
        </Link>
        <Link
          href="/admin/categories"
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-gold/40 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Kategorien</p>
              <p className="text-2xl font-semibold">{counts.categories}</p>
            </div>
            <div className="p-3 rounded-xl bg-jmle-warm text-gold-dark">
              <FolderTree size={22} />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
