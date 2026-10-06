"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";

type BrandRow = {
  id: string;
  name: string;
  image: string;
  link_url?: string | null;
  sort_order?: number;
  active?: boolean;
};

/**
 * Sofort speicherbares Marken-Logo-CRUD (Ticker-Inhalt).
 * Styles (Größe/Speed) bleiben im Parent als Layout-Draft.
 */
export default function BuilderBrandsPanel({
  de,
  onChanged,
}: {
  de: boolean;
  onChanged?: () => void;
}) {
  const { t } = useAdminI18n();
  const [logos, setLogos] = useState<BrandRow[]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    image: "",
    link_url: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoOpenImageUrl, setAutoOpenImageUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/brands");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || data.hint || "Fehler");
      return;
    }
    setLogos(data.logos ?? []);
    if (data.hint) setError(data.hint);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id: form.id || undefined,
        sort_order: form.id
          ? logos.find((l) => l.id === form.id)?.sort_order ?? 0
          : logos.length,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      const msg =
        res.status === 409
          ? de
            ? "Dieser Markenname existiert bereits"
            : String(data.errorAr || "اسم العلامة موجود بالفعل")
          : data.error || data.hint || "Fehler";
      setError(msg);
      toast.error(msg);
      return;
    }
    setForm({ id: "", name: "", image: "", link_url: "", active: true });
    await load();
    toast.success(de ? "Logo gespeichert (live)" : "تم الحفظ (مباشر)");
    onChanged?.();
  };

  const remove = async (id: string) => {
    if (!confirm(de ? "Logo löschen?" : "حذف الشعار؟")) return;
    await fetch(`/api/admin/brands?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-4 border-t border-zinc-100 pt-4">
      <div>
        <h3 className="text-xs font-semibold text-zinc-800">
          {de ? "Marken-Logos" : "شعارات العلامات"}
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500">
          {de
            ? "Logos werden sofort live gespeichert. Größe/Tempo oben als Entwurf."
            : "تُحفظ الشعارات مباشرة. الحجم/السرعة أعلاه كمسودة."}
        </p>
      </div>
      {error ? (
        <p className="rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}
      <form onSubmit={save} className="space-y-2.5">
        <ImageUpload
          value={form.image}
          onChange={(url) =>
            setForm((f) => ({
              ...f,
              image: typeof url === "string" ? url : url[0] || "",
            }))
          }
          folder="brands"
          enableEditor
          autoOpenUrl={autoOpenImageUrl}
          onAutoOpenConsumed={() => setAutoOpenImageUrl(null)}
        />
        <input
          className="h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs"
          required
          placeholder={de ? "Markenname (intern)" : "اسم العلامة (داخلي)"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs"
          placeholder={de ? "Link (optional)" : "رابط (اختياري)"}
          value={form.link_url}
          onChange={(e) => setForm({ ...form, link_url: e.target.value })}
        />
        <button
          type="submit"
          disabled={saving || !form.image || !form.name.trim()}
          className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-zinc-900 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Plus size={14} />
          {saving ? t("saving") : t("save")}
        </button>
      </form>
      <ul className="space-y-2">
        {logos.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2"
          >
            <button
              type="button"
              className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-50"
              onClick={() => {
                setForm({
                  id: l.id,
                  name: l.name,
                  image: l.image,
                  link_url: l.link_url || "",
                  active: l.active !== false,
                });
                setAutoOpenImageUrl(l.image || null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.image}
                alt={l.name}
                className="h-full w-full object-contain"
              />
            </button>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
              {l.name}
            </span>
            <button
              type="button"
              className="text-[10px] text-amber-700"
              onClick={() => {
                setAutoOpenImageUrl(null);
                setForm({
                  id: l.id,
                  name: l.name,
                  image: l.image,
                  link_url: l.link_url || "",
                  active: l.active !== false,
                });
              }}
            >
              {t("edit")}
            </button>
            <button
              type="button"
              className="p-1 text-red-500"
              onClick={() => void remove(l.id)}
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
