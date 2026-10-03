/**
 * Ziel-DB für Brand-Reset & Admin-Skripte.
 *
 * Standard: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Optional: PRODUCTION_* überschreibt, wenn gesetzt.
 */

export type SupabaseTarget = {
  url: string;
  serviceRoleKey: string;
  label: "production" | "local" | "runtime";
  hint: string;
};

/** Bekanntes Production-Projekt (aus Live-Site / next.config Fallback). */
export const KNOWN_PRODUCTION_SUPABASE_HOST =
  "rbdarbzwbzpfjorgeavi.supabase.co";

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return /127\.0\.0\.1|localhost/i.test(url);
  }
}

function isProductionSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** JWT-Payload ohne Verify (nur zur Ziel-Erkennung). */
export function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
        : Buffer.from(padded, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function projectUrlFromServiceKey(key: string): string | null {
  const payload = decodeJwtPayload(key);
  if (!payload) return null;
  if (payload.iss === "supabase-demo") return null;
  const ref = typeof payload.ref === "string" ? payload.ref : "";
  if (ref && /^[a-z0-9]+$/i.test(ref)) {
    return `https://${ref}.supabase.co`;
  }
  return null;
}

function pickLabel(url: string): SupabaseTarget["label"] {
  if (isLocalSupabaseUrl(url)) return "local";
  if (isProductionSupabaseUrl(url)) return "production";
  return "runtime";
}

/**
 * Runtime-Ziel für Marken-Reset (API + Skripte).
 * Reihenfolge:
 * 1) PRODUCTION_* / SUPABASE_PRODUCTION_* (falls gesetzt)
 * 2) SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * 3) NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  ← Standard
 * 4) JWT-ref aus Service-Role-Key
 * 5) Bekannter Production-Host + nicht-lokaler Service-Key
 *
 * Localhost wird akzeptiert, wenn die Standard-Variablen darauf zeigen
 * (lokale Dev-DB / Supabase CLI).
 */
export function resolveRuntimeSupabaseTarget(): SupabaseTarget {
  const serviceKey = (
    process.env.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PRODUCTION_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  const candidates: Array<{ url?: string; key?: string; hint: string }> = [
    {
      url: process.env.PRODUCTION_SUPABASE_URL,
      key: process.env.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY,
      hint: "PRODUCTION_SUPABASE_*",
    },
    {
      url: process.env.SUPABASE_PRODUCTION_URL,
      key: process.env.SUPABASE_PRODUCTION_SERVICE_ROLE_KEY,
      hint: "SUPABASE_PRODUCTION_*",
    },
    {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      hint: "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      hint: "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    },
  ];

  const fromJwt = serviceKey ? projectUrlFromServiceKey(serviceKey) : null;
  if (fromJwt && serviceKey) {
    candidates.push({
      url: fromJwt,
      key: serviceKey,
      hint: "JWT ref claim + service role key",
    });
  }

  if (
    serviceKey &&
    decodeJwtPayload(serviceKey)?.iss !== "supabase-demo"
  ) {
    candidates.push({
      url: `https://${KNOWN_PRODUCTION_SUPABASE_HOST}`,
      key: serviceKey,
      hint: "known production host + service role key",
    });
  }

  for (const c of candidates) {
    const url = (c.url || "").trim();
    const key = (c.key || "").trim();
    if (!url || !key) continue;
    try {
      // URL validieren
      new URL(url);
    } catch {
      continue;
    }
    return {
      url,
      serviceRoleKey: key,
      label: pickLabel(url),
      hint: c.hint,
    };
  }

  throw new Error(
    [
      "Keine Supabase-Credentials gefunden.",
      "Bitte setzen (Standard):",
      "  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co",
      "  SUPABASE_SERVICE_ROLE_KEY=eyJ...",
      "Optional: PRODUCTION_SUPABASE_URL + PRODUCTION_SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n")
  );
}

/**
 * @deprecated Prefer resolveRuntimeSupabaseTarget for brand reset.
 * Kept for scripts that still pass { production / allowLocal }.
 */
export function resolveSupabaseTarget(opts?: {
  production?: boolean;
  allowLocal?: boolean;
}): SupabaseTarget {
  const production = opts?.production !== false;
  const allowLocal = Boolean(opts?.allowLocal);

  // Neues Standardverhalten: Runtime-Credentials nutzen
  if (!production || allowLocal) {
    const target = resolveRuntimeSupabaseTarget();
    if (isLocalSupabaseUrl(target.url) && !allowLocal && !production) {
      throw new Error(
        "Lokales Supabase erkannt. Nutze --local oder setze ALLOW_LOCAL_SUPABASE=1."
      );
    }
    return target;
  }

  // production: true — Runtime nutzen, aber localhost überspringen wenn möglich
  const serviceKey = (
    process.env.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PRODUCTION_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  const candidates: Array<{ url?: string; key?: string; hint: string }> = [
    {
      url: process.env.PRODUCTION_SUPABASE_URL,
      key: process.env.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY,
      hint: "PRODUCTION_SUPABASE_*",
    },
    {
      url: process.env.SUPABASE_PRODUCTION_URL,
      key: process.env.SUPABASE_PRODUCTION_SERVICE_ROLE_KEY,
      hint: "SUPABASE_PRODUCTION_*",
    },
    {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      hint: "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      hint: "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    },
  ];

  const fromJwt = serviceKey ? projectUrlFromServiceKey(serviceKey) : null;
  if (fromJwt && serviceKey) {
    candidates.push({
      url: fromJwt,
      key: serviceKey,
      hint: "JWT ref claim + service role key",
    });
  }
  if (
    serviceKey &&
    decodeJwtPayload(serviceKey)?.iss !== "supabase-demo"
  ) {
    candidates.push({
      url: `https://${KNOWN_PRODUCTION_SUPABASE_HOST}`,
      key: serviceKey,
      hint: "known production host + service role key",
    });
  }

  // Erst nicht-lokale Kandidaten
  for (const c of candidates) {
    const url = (c.url || "").trim();
    const key = (c.key || "").trim();
    if (!url || !key) continue;
    if (isLocalSupabaseUrl(url)) continue;
    if (decodeJwtPayload(key)?.iss === "supabase-demo") continue;
    if (!isProductionSupabaseUrl(url) && !fromJwt) {
      // trotzdem erlauben wenn https supabase
      if (!isProductionSupabaseUrl(url)) continue;
    }
    return {
      url,
      serviceRoleKey: key,
      label: "production",
      hint: c.hint,
    };
  }

  // Fallback: Standard-Runtime (auch localhost) — wie vom User gefordert
  return resolveRuntimeSupabaseTarget();
}
