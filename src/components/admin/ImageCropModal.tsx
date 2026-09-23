"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, Check, X } from "lucide-react";
import { canvasToCompressedFile } from "@/lib/compress-image";
import { Button } from "@/components/ui";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Offizielles Pattern von react-easy-crop (inkl. Rotation) */
async function getCroppedCanvas(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<HTMLCanvasElement> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  const rot = rad(rotation);
  const { width: bBoxW, height: bBoxH } = {
    width:
      Math.abs(Math.cos(rot) * image.width) +
      Math.abs(Math.sin(rot) * image.height),
    height:
      Math.abs(Math.sin(rot) * image.width) +
      Math.abs(Math.cos(rot) * image.height),
  };

  canvas.width = bBoxW;
  canvas.height = bBoxH;
  ctx.translate(bBoxW / 2, bBoxH / 2);
  ctx.rotate(rot);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export default function ImageCropModal({
  file,
  onComplete,
  onCancel,
  aspect = 1,
}: {
  file: File;
  onComplete: (cropped: File) => void;
  onCancel: () => void;
  aspect?: number;
}) {
  const [src] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const apply = async () => {
    if (!croppedArea) return;
    setBusy(true);
    try {
      const canvas = await getCroppedCanvas(src, croppedArea, rotation);
      const out = await canvasToCompressedFile(canvas, "product.webp");
      URL.revokeObjectURL(src);
      onComplete(out);
    } catch (e) {
      console.error(e);
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bild zuschneiden"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Hauptbild zuschneiden</h2>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(src);
              onCancel();
            }}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative h-72 bg-gray-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-emerald-400/80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-emerald-400/80"
            aria-hidden
          />
        </div>

        <div className="p-4 space-y-4">
          <label className="block text-xs text-gray-600">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full mt-1 accent-orange-500"
            />
          </label>
          <label className="block text-xs text-gray-600">
            Rotation / Wasserwaage ({rotation.toFixed(1)}°)
            <input
              type="range"
              min={-45}
              max={45}
              step={0.5}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full mt-1 accent-orange-500"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leadingIcon={<RotateCcw size={14} />}
              onClick={() => {
                setRotation(0);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
            >
              Zurücksetzen
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={busy}
              leadingIcon={<Check size={14} />}
              onClick={() => void apply()}
            >
              {busy ? "Komprimiere…" : "Übernehmen & komprimieren"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
