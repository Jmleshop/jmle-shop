/** Liefergebiet: 30 km um 71032 Böblingen (OpenPLZ + Nominatim). */
export const DELIVERY_HUB = { lat: 48.6856, lon: 9.0114 };
export const DELIVERY_MAX_KM = 30;

type Locality = { postalCode?: string; name?: string };

function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function parseQuery(raw: string) {
  const text = raw.trim();
  const both = text.match(/^(\d{4,5})\s+(.+)$/);
  if (both) return { postalCode: both[1], name: both[2].trim() };
  if (/^\d{3,5}$/.test(text)) return { postalCode: text, name: "" };
  return { postalCode: "", name: text };
}

async function localities(query: { postalCode: string; name: string }) {
  const params = new URLSearchParams();
  if (query.postalCode) params.set("postalCode", query.postalCode);
  else params.set("name", query.name);
  const response = await fetch(`https://openplzapi.org/de/Localities?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as Locality[];
  return rows.filter((row) => row.postalCode && row.name);
}

async function geocode(postalCode: string, name: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("q", `${postalCode} ${name}`);
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "jmle-shop/1.0 (delivery radius)" },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const hit = rows[0];
  if (!hit?.lat || !hit.lon) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon) };
}

export type DeliveryAreaResult =
  | { status: "idle" | "not_found" }
  | { status: "ok" | "outside"; postalCode: string; city: string; distanceKm: number };

export async function checkDeliveryArea(raw: string): Promise<DeliveryAreaResult> {
  const q = raw.trim();
  if (q.length < 3) return { status: "idle" };
  try {
    const parsed = parseQuery(q);
    let rows = await localities(parsed);
    if (parsed.name && parsed.postalCode) {
      const needle = parsed.name.toLocaleLowerCase("de");
      rows = rows.filter((row) => (row.name ?? "").toLocaleLowerCase("de").includes(needle));
    }
    if (rows.length === 0 && parsed.name && !parsed.postalCode) {
      rows = await localities({ postalCode: "", name: parsed.name });
    }
    const place = rows[0];
    if (!place?.postalCode || !place.name) return { status: "not_found" };

    const point = await geocode(place.postalCode, place.name);
    if (!point) return { status: "not_found" };
    const distanceKm = Math.round(kmBetween(DELIVERY_HUB, point));
    return {
      status: kmBetween(DELIVERY_HUB, point) > DELIVERY_MAX_KM ? "outside" : "ok",
      postalCode: place.postalCode,
      city: place.name,
      distanceKm,
    };
  } catch {
    return { status: "not_found" };
  }
}
