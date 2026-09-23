"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Datenschutzkonformes In-House-Tracking:
 * sendet nur Pfad + Geräte-/Sprachattribute (Server liest Header).
 * Keine Cookies, keine User-ID, keine IP-Speicherung.
 */
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }
    // Preview-iframe nicht doppelt zählen
    if (typeof window !== "undefined" && window.self !== window.top) return;

    const t = window.setTimeout(() => {
      void fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    }, 400);

    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
