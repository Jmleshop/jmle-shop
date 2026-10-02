/**
 * Ziel-DB für Brand-Reset & Admin-Skripte.
 * Produktion hat Vorrang, lokal nur mit --local / ALLOW_LOCAL_SUPABASE=1.
 */

export type SupabaseTarget = {
  url: string;
  serviceRoleKey: string;
  label: "production" | "local";
};

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost" ||
      u.hostname.endsWith(".supabase.red") // unused
    );
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

/**
 * Löst Produktions-Credentials auf.
 * Reihenfolge: PRODUCTION_* → SUPABASE_PRODUCTION_* → NEXT_PUBLIC_* (nur wenn https://*.supabase.co)
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

  for (const c of candidates) {
    const url = (c.url || "").trim();
    const key = (c.key || "").trim();
    if (!url || !key) continue;

    if (production && isLocalSupabaseUrl(url)) {
      continue; // nie lokal, wenn Produktion gefordert
    }
    if (production && !isProductionSupabaseUrl(url)) {
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
        "oder führe gegen Deploy aus: POST /api/admin/brands/reset mit Header x-brand-reset-token.",
      ].join("\n")
    );
  }

  throw new Error("Keine Supabase-Credentials gefunden.");
}
