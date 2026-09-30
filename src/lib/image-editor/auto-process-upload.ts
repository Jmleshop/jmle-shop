import { MAX_EDGE_PRODUCT } from "@/lib/image-bounds";
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
 * @deprecated Nicht mehr vom Upload aufgerufen.
 * Auto-Freisteller ist deaktiviert (schneidet Motive).
 * Nur noch für explizite manuelle/Batch-Aufrufe gedacht.
 */
export async function autoProcessProductFile(
  file: File,
  onProgress?: (progress: AutoProcessProgress) => void,
  options?: { maxEdge?: number }
): Promise<File> {
  const maxEdge = options?.maxEdge ?? MAX_EDGE_PRODUCT;
  void preloadBackgroundRemoval();
  onProgress?.({
    phase: "process",
    ratio: 0.05,
    label: "⚡ إزالة الخلفية بالذكاء الاصطناعي (وضع التوربو)…",
    fileName: file.name,
  });

  const source =
    file.type.startsWith("image/")
      ? file
      : new File([file], file.name, { type: "image/png" });

  try {
    const detailed = await removeImageBackgroundDetailed(
      source,
      (p) => onProgress?.({ ...p, fileName: file.name }),
      { maxEdge }
    );
    onProgress?.({
      phase: "finalize",
      ratio: 1,
      label: "جاهز — شفاف ومركّز",
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
      label: "⚡ تحسين توربو على الخادم…",
      engine: "server",
      fileName: file.name,
    });
    const form = new FormData();
    form.append("file", source, source.name || "product.png");
    form.append("removeBackground", "1");
    form.append("maxEdge", String(maxEdge));
    const res = await fetch("/api/admin/optimize-product-image", {
      method: "POST",
      body: form,
      credentials: "same-origin",
    });
    if (!res.ok) {
      throw clientErr instanceof Error
        ? clientErr
        : new Error("فشل التحسين التلقائي");
    }
    const blob = await res.blob();
    onProgress?.({
      phase: "finalize",
      ratio: 1,
      label: "جاهز — تحسين الخادم",
      engine: "server",
      fileName: file.name,
    });
    return new File([blob], `product-${Date.now()}.webp`, {
      type: blob.type || "image/webp",
    });
  }
}
