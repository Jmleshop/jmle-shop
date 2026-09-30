export type RemovalProgress = {
  phase: "download" | "process";
  ratio: number;
  label: string;
};

/**
 * ISNet-Freisteller im Browser (`@imgly/background-removal`).
 * `isnet_fp16` ist das kleinere, hochoptimierte Modell — typisch 2–3s nach Cache,
 * vollständig kostenlos (WASM im Client, keine externe API).
 */
export async function removeImageBackground(
  blob: Blob,
  onProgress?: (progress: RemovalProgress) => void
): Promise<Blob> {
  onProgress?.({
    phase: "download",
    ratio: 0,
    label: "KI-Modell wird vorbereitet…",
  });

  const { removeBackground } = await import("@imgly/background-removal");

  return removeBackground(blob, {
    model: "isnet_fp16",
    device: "cpu",
    output: {
      format: "image/png",
      quality: 0.92,
    },
    progress: (key: string, current: number, total: number) => {
      const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
      const download = key.startsWith("fetch");
      onProgress?.({
        phase: download ? "download" : "process",
        ratio,
        label: download ? "KI-Modell wird geladen…" : "Produkt wird freigestellt…",
      });
    },
  });
}
