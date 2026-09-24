/**
 * Kanonische Produktions-Domain — niemals Vercel-Preview-URLs verwenden.
 */
export const PRODUCTION_APP_URL = "https://jmle-shop.vercel.app";
export const PRODUCTION_HOST = "jmle-shop.vercel.app";

export function isPreviewDeploymentHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0].trim();
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h === PRODUCTION_HOST) return false;
  // Alle anderen *.vercel.app Deployments (z. B. jmle-shop-xxxxx-jmle-shop.vercel.app)
  return h.endsWith(".vercel.app");
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(withProto);
    if (isPreviewDeploymentHost(u.hostname)) return PRODUCTION_APP_URL;
    return `${u.protocol}//${u.host}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Server/Build: stabile Site-URL ohne Preview-Deployments.
 * Bevorzugt NEXT_PUBLIC_APP_URL, fällt sonst auf Produktionsdomain zurück.
 */
export function getAppUrl(): string {
  const fromEnv = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  const vercelProd = normalizeOrigin(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? ""
  );
  if (vercelProd) return vercelProd;

  return PRODUCTION_APP_URL;
}

/**
 * Client: window.location.origin, aber Preview → Produktionsdomain.
 */
export function getClientAppOrigin(): string {
  if (typeof window === "undefined") return getAppUrl();
  const { origin, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  if (isPreviewDeploymentHost(hostname)) return PRODUCTION_APP_URL;
  return origin.replace(/\/$/, "");
}

/** Absolute URL für Redirects (vermeidet Preview-Hosts aus request.url). */
export function absoluteAppUrl(path: string, requestUrl?: string): URL {
  if (requestUrl) {
    try {
      const req = new URL(requestUrl);
      if (!isPreviewDeploymentHost(req.hostname)) {
        return new URL(path, req.origin);
      }
    } catch {
      /* fallthrough */
    }
  }
  return new URL(path, getAppUrl());
}
