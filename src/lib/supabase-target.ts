/**
 * Ziel-DB für Brand-Reset & Admin-Skripte.
 * Produktion hat Vorrang, lokal nur mit --local / ALLOW_LOCAL_SUPABASE=1.
 */

export type SupabaseTarget = {
  url: string;
  serviceRoleKey: string;
  label: "production" | "local";
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
  // Lokales CLI-JWT
  if (payload.iss === "supabase-demo") return null;
  const ref = typeof payload.ref === "string" ? payload.ref : "";
  if (ref && /^[a-z0-9]+$/i.test(ref)) {
    return `https://${ref}.supabase.co`;
  }
  return null;
}

/**
 * Löst Produktions-Credentials auf.
 * Reihenfolge:
 * 1) PRODUCTION_* / SUPABASE_PRODUCTION_*
 * 2) NEXT_PUBLIC_* wenn https://*.supabase.co
 * 3) Service-Role-JWT → Project-URL (ref claim)
 * 4) Bekannter Production-Host + Production/Service Key (wenn Key nicht lokal)
 */
export function resolveSupabaseTarget(opts?: {
  /** true = Produktion erzwingen, localhost ablehnen */
  production?: boolean;
  /** true = lokales Supabase explizit erlauben */
  allowLocal?: boolean;
}): SupabaseTarget {
  const production = opts?.production !== false; // default: production
  const allowLocal = Boolean(opts?.allowLocal);

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
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      hint: "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    },
  ];

  // JWT-ref → URL (wenn Production-Key ohne URL gesetzt)
  const prodKey =
    process.env.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PRODUCTION_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  const fromJwt = prodKey ? projectUrlFromServiceKey(prodKey) : null;
  if (fromJwt && prodKey) {
    candidates.push({
      url: fromJwt,
      key: prodKey,
      hint: "JWT ref claim + service role key",
    });
  }

  // Bekannter Host + Key (Vercel/CI, wenn URL fehlt aber Key Production ist)
  if (prodKey && projectUrlFromServiceKey(prodKey)) {
    candidates.push({
      url: `https://${KNOWN_PRODUCTION_SUPABASE_HOST}`,
      key: prodKey,
      hint: "known production host + service role key",
    });
  } else if (
    prodKey &&
    decodeJwtPayload(prodKey)?.iss !== "supabase-demo" &&
    production
  ) {
    // Key sieht nicht lokal aus, aber ohne ref — trotzdem bekannten Host versuchen
    candidates.push({
      url: `https://${KNOWN_PRODUCTION_SUPABASE_HOST}`,
      key: prodKey,
      hint: "known production host + non-local service role key",
    });
  }

  for (const c of candidates) {
    const url = (c.url || "").trim();
    const key = (c.key || "").trim();
    if (!url || !key) continue;

    if (production && isLocalSupabaseUrl(url)) {
      continue;
    }
    if (production && !isProductionSupabaseUrl(url)) {
      continue;
    }
    // Lokales Demo-JWT nie gegen Production schicken
    if (production && decodeJwtPayload(key)?.iss === "supabase-demo") {
      continue;
    }
    if (!production && isLocalSupabaseUrl(url) && !allowLocal) {
      throw new Error(
        "Lokales Supabase erkannt. Nutze --local oder setze ALLOW_LOCAL_SUPABASE=1."
      );
    }

    return {
      url,
      serviceRoleKey: key,
      label: isLocalSupabaseUrl(url) ? "local" : "production",
    };
  }

  if (production) {
    throw new Error(
      [
        "Keine Produktions-Supabase-Credentials gefunden.",
        "Bitte setzen:",
        "  PRODUCTION_SUPABASE_URL=https://xxxx.supabase.co",
        "  PRODUCTION_SUPABASE_SERVICE_ROLE_KEY=eyJ...",
        "oder auf Vercel: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Live).",
        "Dann: POST /api/admin/force-reset-brands",
      ].join("\n")
    );
  }

  throw new Error("Keine Supabase-Credentials gefunden.");
}
