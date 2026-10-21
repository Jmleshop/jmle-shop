"use client";

import { useEffect, useRef, useState } from "react";

type ScanHit = {
  id: string;
  name_de?: string | null;
  name_ar?: string | null;
  stock_quantity: number;
};

function beep(ok: boolean) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = ok ? 880 : 220;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.value = 0.08;
  osc.start();
  osc.stop(ctx.currentTime + (ok ? 0.08 : 0.2));
  window.setTimeout(() => void ctx.close(), 400);
}

export default function PosPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [message, setMessage] = useState("");
  const [hit, setHit] = useState<ScanHit | null>(null);
  const [unknown, setUnknown] = useState("");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<ScanHit[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function apply(barcode: string, delta: number, productId?: string) {
    const response = await fetch("/api/admin/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode, delta, productId, assign: Boolean(productId) }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) {
      setUnknown(barcode);
      setHit(null);
      setMessage("Barcode nicht gefunden. Produkt jetzt zuweisen?");
      setFlash("bad");
      beep(false);
      return;
    }
    if (!response.ok) {
      setMessage(data.error || "Scan fehlgeschlagen");
      setFlash("bad");
      beep(false);
      return;
    }
    const product = data.product as ScanHit;
    setUnknown("");
    setHit(product);
    setMessage(`${product.name_de || product.name_ar} — Neuer Bestand: ${product.stock_quantity} Stück`);
    setFlash("ok");
    beep(true);
    window.setTimeout(() => setFlash(null), 700);
  }

  async function startCamera() {
    if (!("BarcodeDetector" in window)) {
      setMessage("Dieser Browser hat keinen Kamera-Scanner. Ein USB-Handscanner funktioniert im Feld.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();
    const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "qr_code"] });
    const timer = window.setInterval(async () => {
      const codes = await detector.detect(video);
      const value = codes[0]?.rawValue;
      if (!value) return;
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      setCode("");
      await apply(value, -Math.max(1, qty));
      inputRef.current?.focus();
    }, 400);
  }

  return (
    <div className={flash === "ok" ? "rounded-3xl bg-green-100 p-4 transition-colors" : flash === "bad" ? "rounded-3xl bg-red-100 p-4" : "p-1"}>
      <h1 className="mb-2 text-2xl font-semibold">Schnellverkauf & Scanner</h1>
      <p className="mb-6 text-sm text-gray-500">Handscanner mit Enter oder Kamera. Jeder Scan senkt den Bestand.</p>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const barcode = code.trim();
          if (!barcode) return;
          setCode("");
          void apply(barcode, -Math.max(1, qty));
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Barcode scannen"
          className="min-h-14 flex-1 rounded-2xl border px-4 text-lg"
          autoComplete="off"
        />
        <label className="text-sm">
          Anzahl
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
            className="mt-1 block min-h-14 w-24 rounded-2xl border px-3"
          />
        </label>
        <button type="button" onClick={() => void startCamera()} className="min-h-14 rounded-2xl border px-4">
          Kamera
        </button>
      </form>
      {hit && <p className="mt-6 text-3xl font-semibold">{message}</p>}
      {!hit && message && <p className="mt-6 text-lg">{message}</p>}
      {unknown && (
        <div className="mt-6 rounded-2xl border bg-white p-4">
          <input
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              setSearch(value);
              if (value.trim().length < 2) {
                setMatches([]);
                return;
              }
              void fetch(`/api/admin/pos?q=${encodeURIComponent(value.trim())}`)
                .then((response) => response.json())
                .then((data) => setMatches(data.products ?? []));
            }}
            placeholder="Produkt suchen und Barcode zuweisen"
            className="min-h-11 w-full rounded-xl border px-3"
          />
          <ul className="mt-2">
            {matches.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="w-full px-2 py-2 text-start text-sm hover:bg-orange-50"
                  onClick={() => void apply(unknown, -Math.max(1, qty), product.id)}
                >
                  {product.name_de || product.name_ar}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    BarcodeDetector: new (options?: { formats?: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
    };
  }
}
