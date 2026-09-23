"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, X, Star, Crop } from "lucide-react";
import { uploadProductImage } from "@/lib/compress-image";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import ImageCropModal from "@/components/admin/ImageCropModal";

export default function ImageUpload({
  value,
  onChange,
  folder = "products",
  multiple = false,
  enableCrop = false,
}: {
  value: string | string[];
  onChange: (urls: string | string[]) => void;
  folder?: string;
  multiple?: boolean;
  /** Crop-Editor mit Raster & Rotation vor Upload (Hauptbild) */
  enableCrop?: boolean;
}) {
  const { t } = useAdminI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const urls = Array.isArray(value) ? value : value ? [value] : [];

  const uploadOne = async (file: File) => {
    return uploadProductImage(file, folder);
  };

  const handleFiles = async (files: FileList) => {
    setError("");
    const list = Array.from(files);
    if (!list.length) return;

    // Erste Datei optional durch Crop-Editor (Hauptbild-Qualität)
    if (enableCrop && list[0]) {
      setCropFile(list[0]);
      // Rest ohne Crop nachladen
      if (list.length > 1 && multiple) {
        setUploading(true);
        try {
          const rest = await Promise.all(list.slice(1).map((f) => uploadOne(f)));
          onChange([...urls, ...rest]);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
        } finally {
          setUploading(false);
        }
      }
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadOne(file));
      }
      if (multiple) onChange([...urls, ...uploaded]);
      else onChange(uploaded[0] ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const onCropDone = async (file: File) => {
    setCropFile(null);
    setUploading(true);
    setError("");
    try {
      const url = await uploadOne(file);
      if (multiple) onChange([...urls, url]);
      else onChange(url);
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

  const setCover = (url: string) => {
    if (!multiple) return;
    const next = [url, ...urls.filter((u) => u !== url)];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm mb-1">{t("images")}</label>
      <p className="text-[11px] text-gray-500 mb-2">
        Automatische WebP-Kompression. Bei mehreren Bildern: Stern = Hauptbild
        (Cover). Crop-Editor mit Raster & Wasserwaage optional vor Upload.
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div
            key={url}
            className={`relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 ring-2 ${
              index === 0 ? "ring-gold" : "ring-transparent"
            }`}
          >
            <Image
              src={url}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 text-[9px] bg-gold text-white px-1.5 py-0.5 rounded font-medium">
                Cover
              </span>
            )}
            <div className="absolute top-1 right-1 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => remove(url)}
                className="p-1.5 min-h-8 min-w-8 bg-white/90 rounded-full flex items-center justify-center"
                aria-label="Bild entfernen"
              >
                <X size={12} />
              </button>
              {multiple && index !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(url)}
                  className="p-1.5 min-h-8 min-w-8 bg-white/90 rounded-full flex items-center justify-center text-gold"
                  title="Als Hauptbild festlegen"
                  aria-label="Als Hauptbild festlegen"
                >
                  <Star size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <label className="flex items-center justify-center gap-2 border border-dashed border-gold/40 rounded-xl py-3 text-sm text-gray-600 cursor-pointer hover:bg-jmle-warm min-h-12">
        {enableCrop ? <Crop size={16} /> : <Upload size={16} />}
        {uploading
          ? t("saving")
          : enableCrop
            ? "Bild wählen (Crop + Kompression)"
            : t("images")}
        <input
          type="file"
          accept="image/*"
          multiple={multiple && !enableCrop}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="text-red-500 text-xs">{error}</p>}

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onComplete={(f) => void onCropDone(f)}
          onCancel={() => setCropFile(null)}
          aspect={1}
        />
      )}
    </div>
  );
}
