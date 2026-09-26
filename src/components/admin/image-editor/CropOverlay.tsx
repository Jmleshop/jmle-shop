"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { resizeCrop, type CropHandle } from "@/lib/image-editor/geometry";
import type { NormRect } from "@/lib/image-editor/types";

const HANDLES: { id: CropHandle; className: string }[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { id: "sw", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
  { id: "s", className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
  { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
];

export default function CropOverlay({
  crop,
  normRatio,
  onChange,
}: {
  crop: NormRect;
  normRatio: number | null;
  onChange: (next: NormRect) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef(crop);
  const ratioRef = useRef(normRatio);
  cropRef.current = crop;
  ratioRef.current = normRatio;

  const start = (event: ReactPointerEvent, handle: CropHandle) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width < 2 || bounds.height < 2) return;
    const origin = {
      x: event.clientX,
      y: event.clientY,
      crop: { ...cropRef.current },
      handle,
    };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - origin.x) / bounds.width;
      const dy = (ev.clientY - origin.y) / bounds.height;
      onChange(resizeCrop(origin.crop, origin.handle, dx, dy, ratioRef.current));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden touch-none" data-crop-root>
      <div
        className="absolute border-2 border-white cursor-move"
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.w * 100}%`,
          height: `${crop.h * 100}%`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
        }}
        onPointerDown={(event) => start(event, "move")}
      >
        <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/50" />
        <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/50" />
        <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/50" />
        <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/50" />
        {HANDLES.map((handle) => (
          <button
            key={handle.id}
            type="button"
            aria-label={handle.id}
            className={`absolute z-10 h-3.5 w-3.5 rounded-sm border border-orange-500 bg-white shadow ${handle.className}`}
            onPointerDown={(event) => start(event, handle.id)}
          />
        ))}
      </div>
    </div>
  );
}
