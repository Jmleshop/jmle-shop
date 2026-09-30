import {
  preloadBackgroundRemoval,
  removeImageBackgroundDetailed,
  type RemovalProgress,
} from "@/lib/image-editor/remove-background";

export type AutoProcessProgress = RemovalProgress & {
  fileName?: string;
  index?: number;
  total?: number;
};

/**
 * Zero-Click-Pipeline für neue Uploads:
 * Freisteller (WebGPU/WASM → Server) + Trim/Zentrierung (bereits in removeImageBackgroundDetailed).
 */
export async function autoProcessProductFile(
  file: File,
  onProgress?: (progress: AutoProcessProgress) => void
): Promise<File> {
  void preloadBackgroundRemoval();
  onProgress?.({
    phase: "process",
    ratio: 0.05,
    label: "⚡ Entferne Hintergrund mit KI (Turbo-Modus)…",
    fileName: file.name,
  });

  const source =
    file.type.startsWith("image/")
      ? file
      : new File([file], file.name, { type: "image/png" });

  try {
    const detailed = await removeImageBackgroundDetailed(source, (p) =>
      onProgress?.({ ...p, fileName: file.name })
    );
    onProgress?.({
      phase: "finalize",
      ratio: 1,
      label: "Fertig — zentriert & transparent",
      engine: detailed.engine,
      fileName: file.name,
    });
    return new File([detailed.blob], `product-${Date.now()}.png`, {
      type: "image/png",
    });
  } catch (clientErr) {
    console.warn("[auto-process] client failed, trying server optimize", clientErr);
    onProgress?.({
      phase: "fallback",
      ratio: 0.2,
      label: "⚡ Server-Turbo-Optimierung…",
      engine: "server",
      fileName: file.name,
    });
    const form = new FormData();
    form.append("file", source, source.name || "product.png");
    form.append("removeBackground", "1");
    const res = await fetch("/api/admin/optimize-product-image", {
      method: "POST",
      body: form,
      credentials: "same-origin",
    });
    if (!res.ok) {
      throw clientErr instanceof Error
        ? clientErr
        : new Error("Auto-Optimierung fehlgeschlagen");
    }
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? "png" : "webp";
    onProgress?.({
      phase: "finalize",
      ratio: 1,
      label: "Fertig — Server-Optimierung",
      engine: "server",
      fileName: file.name,
    });
    return new File([blob], `product-${Date.now()}.${ext}`, {
      type: blob.type || `image/${ext}`,
    });
  }
}
