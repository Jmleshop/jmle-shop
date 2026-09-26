"use client";

import { useEffect, useRef, useState } from "react";

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

export default function BarcodeScanModal({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Ctor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => Detector })
          .BarcodeDetector;
        if (!Ctor) {
          setError("Dieser Browser hat keine Barcode-Erkennung. Code bitte eintippen.");
          return;
        }
        const detector = new Ctor({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a"],
        });
        timer = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value) onDetect(value);
          } catch {
            /* frame not ready */
          }
        }, 450);
      } catch {
        setError("Kamera konnte nicht geöffnet werden.");
      }
    })();

    return () => {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Barcode scannen</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm">
            Schließen
          </button>
        </div>
        <video ref={videoRef} className="aspect-[4/3] w-full bg-black object-cover" muted playsInline />
        {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}
        <p className="px-4 py-3 text-xs text-gray-500">
          Halte den Barcode in die Kamera. Der Treffer wird in die Live-Suche übernommen.
        </p>
      </div>
    </div>
  );
}
