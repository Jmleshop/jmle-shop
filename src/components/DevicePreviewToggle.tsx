"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Smartphone, Monitor, X } from "lucide-react";
import { cn } from "@/lib/cn";

const PREVIEW_PARAM = "_preview";

function DevicePreviewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const isNestedPreview =
    searchParams.get(PREVIEW_PARAM) === "1" ||
    (typeof window !== "undefined" && window.self !== window.top);

  useEffect(() => {
    if (isNestedPreview) return;
    if (pathname.startsWith("/admin")) {
      setVisible(false);
      return;
    }

    // Der Handy-Ansicht-Button bleibt dauerhaft sichtbar und kann nicht mehr
    // versehentlich ausgeblendet werden.
    if (process.env.NODE_ENV === "development") {
      setVisible(true);
      return;
    }

    fetch("/api/admin/me")
      .then((r) => setVisible(r.ok))
      .catch(() => setVisible(false));
  }, [pathname, isNestedPreview]);

  const buildPreviewUrl = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(PREVIEW_PARAM, "1");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  if (isNestedPreview || !visible) return null;

  return (
    <>
      {!open && (
        <div className="fixed z-[90] bottom-20 md:bottom-6 end-4 flex flex-col items-end gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex items-center gap-2 min-h-11 px-3.5 py-2.5 rounded-full",
              "bg-luxury-ink/90 text-white text-xs font-ui shadow-boutique",
              "hover:bg-luxury-ink transition-colors backdrop-blur-sm border border-white/10"
            )}
            aria-label="Handy-Ansicht öffnen"
          >
            <Smartphone size={16} aria-hidden />
            <span className="hidden sm:inline">Handy-Ansicht</span>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Handy-Vorschau"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-full bg-white text-sm font-ui text-luxury-ink shadow-md hover:bg-jmle-warm"
            >
              <Monitor size={16} aria-hidden />
              Desktop-Ansicht
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white text-luxury-ink shadow-md hover:bg-jmle-warm"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="relative bg-zinc-900 rounded-[2.5rem] p-3 shadow-2xl ring-1 ring-white/20 max-w-full"
            style={{ width: "min(399px, 100%)" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-900 rounded-b-2xl z-10" />
            <div
              className="overflow-hidden rounded-[2rem] bg-jmle-cream mx-auto"
              style={{
                width: "min(375px, calc(100vw - 3rem))",
                height: "min(812px, calc(100vh - 8rem))",
              }}
            >
              <iframe
                title="Handy-Vorschau"
                src={buildPreviewUrl()}
                className="w-full h-full border-0 bg-jmle-cream"
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/70 font-ui">
            Viewport ~375px · nur Vorschau (Dev / Admin)
          </p>
        </div>
      )}
    </>
  );
}

export default function DevicePreviewToggle() {
  return (
    <Suspense fallback={null}>
      <DevicePreviewInner />
    </Suspense>
  );
}
