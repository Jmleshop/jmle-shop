"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Star, Crop, Pencil } from "lucide-react";
import { uploadProductImage } from "@/lib/compress-image";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { copyFor } from "@/lib/image-editor/copy";

const ImageEditorModal = dynamic(() => import("@/components/admin/ImageEditorModal"), {
  ssr: false,
});

type EditorSession = {
  key: string;
  source: File | string;
  replaceUrl?: string;
  step?: { current: number; total: number };
};

function fileKey(file: File, index: number) {
  return `${index}-${file.name}-${file.size}-${file.lastModified}`;
}

export default function ImageUpload({
  value,
  onChange,
  folder = "products",
  multiple = false,
  enableCrop = false,
  enableEditor = false,
}: {
  value: string | string[];
  onChange: (urls: string | string[]) => void;
  folder?: string;
  multiple?: boolean;
  /** Öffnet den Bildeditor (Freisteller, Filter, Zuschnitt) vor dem Upload. */
  enableEditor?: boolean;
  /** @deprecated Alias für enableEditor */
  enableCrop?: boolean;
}) {
  const { lang, t } = useAdminI18n();
  const copy = copyFor(lang);
  const editorEnabled = enableEditor || enableCrop;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<EditorSession | null>(null);
  const urls = Array.isArray(value) ? value : value ? [value] : [];
  const urlsKey = urls.join("\n");
  const urlsKeyRef = useRef(urlsKey);
  const urlsRef = useRef(urls);
  if (urlsKeyRef.current !== urlsKey) {
    urlsKeyRef.current = urlsKey;
    urlsRef.current = urls;
  }
  const batchRef = useRef<File[] | null>(null);
  const batchIndexRef = useRef(0);

  const publish = (next: string[]) => {
    urlsRef.current = next;
    onChange(multiple ? next : (next[0] ?? ""));
  };

  const uploadOne = async (file: File) => uploadProductImage(file, folder);

  const openBatch = (files: File[], index: number) => {
    batchRef.current = files;
    batchIndexRef.current = index;
    const file = files[index];
    if (!file) return;
    setSession({
      key: fileKey(file, index),
      source: file,
      step: files.length > 1 ? { current: index + 1, total: files.length } : undefined,
    });
  };

  const handleFiles = async (files: FileList) => {
    setError("");
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;

    if (editorEnabled) {
      openBatch(list, 0);
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadOne(file));
      }
      if (multiple) publish([...urlsRef.current, ...uploaded]);
      else publish(uploaded[0] ? [uploaded[0]] : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const onEditorDone = async (file: File) => {
    const current = session;
    const batch = batchRef.current;
    const index = batchIndexRef.current;
    setSession(null);
    setUploading(true);
    setError("");
    try {
      const url = await uploadOne(file);
      const base = urlsRef.current;
      const next = current?.replaceUrl
        ? base.map((item) => (item === current.replaceUrl ? url : item))
        : multiple
          ? [...base, url]
          : [url];
      publish(next);

      if (batch && !current?.replaceUrl && index + 1 < batch.length) {
        openBatch(batch, index + 1);
      } else {
        batchRef.current = null;
      }
    } catch (cause) {
      batchRef.current = null;
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => {
    const next = urls.filter((item) => item !== url);
    publish(next);
  };

  const setCover = (url: string) => {
    if (!multiple) return;
    publish([url, ...urls.filter((item) => item !== url)]);
  };

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm">{t("images")}</label>
      <p className="mb-2 text-[11px] text-gray-500">
        {editorEnabled
          ? copy.editHint
          : "Automatische WebP-Kompression. Bei mehreren Bildern: Stern = Hauptbild (Cover)."}
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div
            key={url}
            className={`relative h-24 w-24 overflow-hidden rounded-xl bg-white ring-2 ${
              index === 0 ? "ring-gold" : "ring-transparent"
            }`}
          >
            <Image src={url} alt="" fill className="object-contain" sizes="96px" />
            {editorEnabled && (
              <button
                type="button"
                className="absolute inset-0"
                aria-label={copy.title}
                onClick={() => {
                  if (uploading || session) return;
                  batchRef.current = null;
                  setSession({ key: url, source: url, replaceUrl: url });
                }}
              />
            )}
            {index === 0 && (
              <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-gold px-1.5 py-0.5 text-[9px] font-medium text-white">
                {copy.cover}
              </span>
            )}
            {editorEnabled && (
              <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-white/90 p-1 text-gray-700">
                <Pencil size={10} />
              </span>
            )}
            <div className="absolute right-1 top-1 z-10 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => remove(url)}
                className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-white/90 p-1.5"
                aria-label={copy.remove}
              >
                <X size={12} />
              </button>
              {multiple && index !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(url)}
                  className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-white/90 p-1.5 text-gold"
                  title={copy.setCover}
                  aria-label={copy.setCover}
                >
                  <Star size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 py-3 text-sm text-gray-600 hover:bg-jmle-warm">
        {editorEnabled ? <Crop size={16} /> : <Upload size={16} />}
        {uploading ? t("saving") : editorEnabled ? copy.choose : t("images")}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          disabled={uploading || session !== null}
          onChange={(event) => {
            if (event.target.files?.length) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {session && (
        <ImageEditorModal
          key={session.key}
          source={session.source}
          step={session.step}
          onComplete={(file) => void onEditorDone(file)}
          onCancel={() => {
            setSession(null);
            batchRef.current = null;
          }}
        />
      )}
    </div>
  );
}
