"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadProductImage } from "@/lib/compress-image";
import { useAdminI18n } from "@/components/admin/AdminI18n";

export default function ImageUpload({
  value,
  onChange,
  folder = "products",
  multiple = false,
}: {
  value: string | string[];
  onChange: (urls: string | string[]) => void;
  folder?: string;
  multiple?: boolean;
}) {
  const { t } = useAdminI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const urls = Array.isArray(value) ? value : value ? [value] : [];

  const handleFiles = async (files: FileList) => {
    setError("");
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadProductImage(file, folder));
      }
      if (multiple) onChange([...urls, ...uploaded]);
      else onChange(uploaded[0] ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => {
    const next = urls.filter((u) => u !== url);
    onChange(multiple ? next : next[0] ?? "");
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm mb-1">{t("images")}</label>
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-1 right-1 p-0.5 bg-white/90 rounded-full"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <label className="flex items-center justify-center gap-2 border border-dashed border-gold/40 rounded-xl py-3 text-sm text-gray-600 cursor-pointer hover:bg-jmle-warm">
        <Upload size={16} />
        {uploading ? t("saving") : t("images")}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
      </label>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
