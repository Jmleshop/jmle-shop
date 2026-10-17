import { redirect } from "next/navigation";

/** Legacy search URL — Ergebnisse unter /shop?q= */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";
  redirect(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
}
