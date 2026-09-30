import {
  blobHasTransparency,
  trimAndCenterCutout,
  type AlphaStats,
} from "@/lib/image-editor/bg-postprocess";

export type RemovalProgress = {
  phase: "preload" | "download" | "process" | "fallback" | "finalize";
  ratio: number;
  label: string;
  engine?: "webgpu" | "wasm" | "server";
};

export type RemovalResult = {
  blob: Blob;
  engine: "webgpu" | "wasm" | "server";
  durationMs: number;
  stats?: AlphaStats;
};

const PACKAGE_VERSION = "1.7.0";
/** IMG.LY CDN — CORS * + CORP cross-origin; Modelle werden vom Browser gecacht */
export const IMGLY_PUBLIC_PATH =
  `https://staticimgly.com/@imgly/background-removal-data/${PACKAGE_VERSION}/dist/`;

type ImglyConfig = {
  publicPath: string;
  debug?: boolean;
  device?: "cpu" | "gpu";
  model?: "isnet" | "isnet_fp16" | "isnet_quint8";
  output?: {
    format?: "image/png" | "image/jpeg" | "image/webp";
    quality?: number;
    type?: "foreground" | "background" | "mask";
  };
  progress?: (key: string, current: number, total: number) => void;
};

type ImglyModule = {
  removeBackground: (image: Blob, config?: ImglyConfig) => Promise<Blob>;
  preload: (config?: ImglyConfig) => Promise<void>;
};

let imglyPromise: Promise<ImglyModule> | null = null;
let preloadPromise: Promise<void> | null = null;
let preloadDone = false;

function prefersGpu(): boolean {
  if (typeof navigator === "undefined") return false;
  // WebGPU ist der Turbo-Pfad; sonst WASM/WebGL über onnxruntime
  return typeof (navigator as Navigator & { gpu?: unknown }).gpu !== "undefined";
}

function baseConfig(
  onProgress?: (progress: RemovalProgress) => void,
  device: "cpu" | "gpu" = prefersGpu() ? "gpu" : "cpu"
): ImglyConfig {
  return {
    publicPath: IMGLY_PUBLIC_PATH,
    debug: false,
    device,
    model: "isnet_fp16",
    output: {
      format: "image/png",
      quality: 0.92,
      type: "foreground",
    },
    progress: (key: string, current: number, total: number) => {
      const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
      const download = key.startsWith("fetch") || key.includes("load");
      onProgress?.({
        phase: download ? "download" : "process",
        ratio,
        label: download
          ? "⚡ Lade Turbo-KI-Modell…"
          : "⚡ Entferne Hintergrund mit KI (Turbo-Modus)…",
        engine: device === "gpu" ? "webgpu" : "wasm",
      });
    },
  };
}

async function loadImgly(): Promise<ImglyModule> {
  if (!imglyPromise) {
    imglyPromise = import("@imgly/background-removal").then((mod) => ({
      removeBackground: mod.removeBackground,
      preload: mod.preload,
    }));
  }
  return imglyPromise;
}

/** Beim Admin-Start im Hintergrund vorladen — null Wartezeit beim ersten Klick */
export function preloadBackgroundRemoval(
  onProgress?: (progress: RemovalProgress) => void
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (preloadDone) return Promise.resolve();
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    onProgress?.({
      phase: "preload",
      ratio: 0,
      label: "⚡ جاري تجهيز نموذج الذكاء الاصطناعي…",
      engine: prefersGpu() ? "webgpu" : "wasm",
    });
    const imgly = await loadImgly();
    const device = prefersGpu() ? "gpu" : "cpu";
    try {
      await imgly.preload(baseConfig(onProgress, device));
    } catch {
      // GPU-Preload kann scheitern → CPU versuchen
      if (device === "gpu") {
        await imgly.preload(baseConfig(onProgress, "cpu"));
      } else {
        throw new Error("Preload fehlgeschlagen");
      }
    }
    preloadDone = true;
    onProgress?.({
      phase: "preload",
      ratio: 1,
      label: "الذكاء الاصطناعي جاهز (توربو)",
      engine: prefersGpu() ? "webgpu" : "wasm",
    });
  })().catch((err) => {
    preloadPromise = null;
    console.warn("[bg-removal] preload failed", err);
  });

  return preloadPromise ?? Promise.resolve();
}

export function isBackgroundRemovalPreloaded(): boolean {
  return preloadDone;
}

async function runClientRemoval(
  blob: Blob,
  onProgress?: (progress: RemovalProgress) => void
): Promise<{ blob: Blob; engine: "webgpu" | "wasm" }> {
  const imgly = await loadImgly();
  const tryDevice = async (device: "cpu" | "gpu") => {
    onProgress?.({
      phase: "process",
      ratio: 0.05,
      label: "⚡ إزالة الخلفية بالذكاء الاصطناعي (وضع التوربو)…",
      engine: device === "gpu" ? "webgpu" : "wasm",
    });
    const result = await imgly.removeBackground(blob, baseConfig(onProgress, device));
    return {
      blob: result,
      engine: (device === "gpu" ? "webgpu" : "wasm") as "webgpu" | "wasm",
    };
  };

  if (prefersGpu()) {
    try {
      return await tryDevice("gpu");
    } catch (err) {
      console.warn("[bg-removal] WebGPU failed, falling back to WASM", err);
    }
  }
  return tryDevice("cpu");
}

/** Server-Fallback: Node-ONNX small model / optionale HF-API */
async function runServerRemoval(
  blob: Blob,
  onProgress?: (progress: RemovalProgress) => void
): Promise<Blob> {
  onProgress?.({
    phase: "fallback",
    ratio: 0.1,
    label: "⚡ احتياطي توربو على الخادم…",
    engine: "server",
  });
  const body = new FormData();
  body.append("file", blob, "product.png");
  const res = await fetch("/api/admin/remove-background", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Server-Freisteller fehlgeschlagen (${res.status})`);
  }
  onProgress?.({
    phase: "fallback",
    ratio: 0.9,
    label: "⚡ جاري إنهاء نتيجة الخادم…",
    engine: "server",
  });
  return res.blob();
}

/**
 * Hybrid-Freisteller:
 * 1) WebGPU / WASM (isnet_fp16) im Browser
 * 2) Transparenz-Check — bei Fehlschlag Retry / Server-Fallback
 * 3) Trim + 1:1-Zentrierung mit 10 % Padding
 */
export async function removeImageBackground(
  blob: Blob,
  onProgress?: (progress: RemovalProgress) => void
): Promise<Blob> {
  const result = await removeImageBackgroundDetailed(blob, onProgress);
  return result.blob;
}

export async function removeImageBackgroundDetailed(
  blob: Blob,
  onProgress?: (progress: RemovalProgress) => void
): Promise<RemovalResult> {
  const started = performance.now();
  // Preload anstoßen (no-op wenn schon fertig)
  void preloadBackgroundRemoval(onProgress);

  let cutout: Blob | null = null;
  let engine: RemovalResult["engine"] = "wasm";
  let lastError: unknown;

  // --- Primary: Client ---
  try {
    const client = await runClientRemoval(blob, onProgress);
    const ok = await blobHasTransparency(client.blob);
    if (ok) {
      cutout = client.blob;
      engine = client.engine;
    } else {
      console.warn("[bg-removal] client result lacked transparency — retry/fallback");
      // Retry einmal mit CPU falls GPU geliefert hat ohne Alpha
      if (client.engine === "webgpu") {
        try {
          const imgly = await loadImgly();
          const retry = await imgly.removeBackground(blob, baseConfig(onProgress, "cpu"));
          if (await blobHasTransparency(retry)) {
            cutout = retry;
            engine = "wasm";
          }
        } catch (err) {
          lastError = err;
        }
      }
    }
  } catch (err) {
    lastError = err;
    console.warn("[bg-removal] client failed", err);
  }

  // --- Secondary: Server API ---
  if (!cutout) {
    try {
      const serverBlob = await runServerRemoval(blob, onProgress);
      if (await blobHasTransparency(serverBlob)) {
        cutout = serverBlob;
        engine = "server";
      } else {
        throw new Error("Server-Ergebnis ohne Transparenz");
      }
    } catch (err) {
      lastError = err;
      console.warn("[bg-removal] server fallback failed", err);
    }
  }

  if (!cutout) {
    const message =
      lastError instanceof Error
        ? lastError.message
        : "Hintergrund konnte nicht entfernt werden";
    throw new Error(message);
  }

  onProgress?.({
    phase: "finalize",
    ratio: 0.95,
    label: "جاري توسيط القصاصة…",
    engine,
  });

  const finalized = await trimAndCenterCutout(cutout, { padding: 0.12, maxEdge: 2000 });
  // Sicherheitsnetz: Final darf Transparenz nicht verlieren
  if (!(await blobHasTransparency(finalized))) {
    throw new Error("Freisteller verlor Transparenz bei der Finalisierung");
  }

  onProgress?.({
    phase: "finalize",
    ratio: 1,
    label: "جاهز",
    engine,
  });

  return {
    blob: finalized,
    engine,
    durationMs: Math.round(performance.now() - started),
  };
}
