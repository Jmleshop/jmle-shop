import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Findet doppelte Produkte und zeigt, welche bildlosen Einträge gelöscht würden.
 *
 * Standard und `--dry-run` ändern nichts.
 * `--apply` migriert Warenkorb, Merkliste und Bestellpositionen auf den
 * Eintrag mit Bild und löscht danach nur die bildlosen Duplikate.
 */

type ProductRow = {
  id: string;
  name_ar: string | null;
  name_de: string | null;
  image: string | null;
  images: string[] | null;
  barcode: string | null;
  product_number: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

type PlanRow = {
  group: number;
  match: string;
  action: "behalten" | "loeschen" | "pruefen";
  reason: string;
  id: string;
  name_ar: string;
  name_de: string;
  image_url: string;
  created_at: string;
  barcode: string;
  product_number: string;
  deleted_at: string;
  keeper_id: string;
};

const PAGE = 1000;
const RELATIONS = ["order_items", "cart_items", "wishlist_items"] as const;

function loadEnv(file: string) {
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

function norm(value: string | null | undefined): string {
  return (value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function imageUrl(row: ProductRow): string {
  const cover = norm(row.image);
  if (cover) return cover;
  const gallery = Array.isArray(row.images) ? row.images : [];
  return norm(gallery.find((item) => norm(item)));
}

function hasImage(row: ProductRow): boolean {
  return imageUrl(row).length > 0;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function fetchProducts(supabase: SupabaseClient): Promise<{
  rows: ProductRow[];
  source: string;
}> {
  const full =
    "id, name_ar, name_de, image, images, barcode, product_number, created_at, deleted_at";
  const base = await fetchPaged(supabase, "products", full);
  if (base.ok) return { rows: base.rows, source: "products" };

  const withoutSku =
    "id, name_ar, name_de, image, images, barcode, created_at, deleted_at";
  const baseSku = await fetchPaged(supabase, "products", withoutSku);
  if (baseSku.ok) return { rows: baseSku.rows, source: "products (ohne product_number)" };

  const pub =
    "id, name_ar, name_de, image, images, barcode, created_at, deleted_at";
  const view = await fetchPaged(supabase, "products_public", pub);
  if (view.ok) {
    return {
      rows: view.rows,
      source:
        "products_public (nur veröffentlichte, nicht gelöschte; product_number nicht sichtbar)",
    };
  }

  throw new Error(base.error ?? view.error ?? "Produkte konnten nicht gelesen werden");
}

async function fetchPaged(
  supabase: SupabaseClient,
  table: string,
  select: string
): Promise<{ ok: true; rows: ProductRow[] } | { ok: false; error: string }> {
  const rows: ProductRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as unknown as ProductRow[];
    for (const row of batch) {
      rows.push({
        ...row,
        product_number: row.product_number ?? null,
        deleted_at: row.deleted_at ?? null,
        images: Array.isArray(row.images) ? row.images : [],
      });
    }
    if (batch.length < PAGE) break;
  }
  return { ok: true, rows };
}

function buildGroups(rows: ProductRow[]): ProductRow[][] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const uf = new UnionFind();
  for (const row of rows) uf.add(row.id);

  const link = (bucket: Map<string, string>, key: string, id: string) => {
    const previous = bucket.get(key);
    if (previous) uf.union(previous, id);
    else bucket.set(key, id);
  };

  const byName = new Map<string, string>();
  const byBarcode = new Map<string, string>();
  const bySku = new Map<string, string>();
  for (const row of rows) {
    const name = norm(row.name_ar);
    if (name) link(byName, name, row.id);
    const barcode = norm(row.barcode);
    if (barcode) link(byBarcode, barcode, row.id);
    const sku = norm(row.product_number);
    if (sku) link(bySku, sku, row.id);
  }

  const groups = new Map<string, ProductRow[]>();
  for (const row of rows) {
    const root = uf.find(row.id);
    const list = groups.get(root) ?? [];
    list.push(byId.get(row.id)!);
    groups.set(root, list);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

function matchLabel(group: ProductRow[]): string {
  const names = [...new Set(group.map((row) => norm(row.name_ar)).filter(Boolean))];
  const barcodes = [...new Set(group.map((row) => norm(row.barcode)).filter(Boolean))];
  const skus = [...new Set(group.map((row) => norm(row.product_number)).filter(Boolean))];
  const parts = [];
  if (names.length) parts.push(`name_ar: ${names.join(" | ")}`);
  if (barcodes.length) parts.push(`barcode: ${barcodes.join(" | ")}`);
  if (skus.length) parts.push(`sku: ${skus.join(" | ")}`);
  return parts.join(" · ") || "(ohne Schlüssel)";
}

function planGroup(group: ProductRow[], groupNo: number): PlanRow[] {
  const withImage = group.filter(hasImage);
  const match = matchLabel(group);
  const keeper = [...withImage].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
  )[0];

  return group
    .slice()
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .map((row) => {
      const pictured = hasImage(row);
      let action: PlanRow["action"] = "pruefen";
      let reason = "Gruppe ohne klares Bild";
      if (withImage.length === 0) {
        reason = "Keine Version hat ein Bild. Nichts wird gelöscht.";
      } else if (withImage.length > 1 && pictured) {
        action = "behalten";
        reason =
          row.id === keeper?.id
            ? "Mehrere Einträge haben ein Bild. Ältester mit Bild bleibt der Bezug für Verknüpfungen. Keiner mit Bild wird gelöscht."
            : "Hat ein Bild und bleibt. Nur bildlose Dubletten würden gelöscht.";
      } else if (pictured) {
        action = "behalten";
        reason = "Einziger Eintrag mit Bild.";
      } else if (keeper) {
        action = "loeschen";
        reason = `Bild fehlt. Würde gelöscht, Verknüpfungen gehen auf ${keeper.id}.`;
      }
      return {
        group: groupNo,
        match,
        action,
        reason,
        id: row.id,
        name_ar: norm(row.name_ar),
        name_de: norm(row.name_de),
        image_url: imageUrl(row),
        created_at: row.created_at ?? "",
        barcode: norm(row.barcode),
        product_number: norm(row.product_number),
        deleted_at: row.deleted_at ?? "",
        keeper_id: keeper?.id ?? "",
      };
    });
}

async function relationCounts(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Record<(typeof RELATIONS)[number], number | null>> {
  const counts = {
    order_items: 0,
    cart_items: 0,
    wishlist_items: 0,
  } as Record<(typeof RELATIONS)[number], number | null>;

  for (const table of RELATIONS) {
    let total = 0;
    for (let index = 0; index < ids.length; index += 80) {
      const chunk = ids.slice(index, index + 80);
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .in("product_id", chunk);
      if (error) {
        counts[table] = null;
        total = -1;
        break;
      }
      total += count ?? 0;
    }
    if (counts[table] !== null) counts[table] = total;
  }
  return counts;
}

async function migrateProductId(
  supabase: SupabaseClient,
  table: (typeof RELATIONS)[number],
  fromId: string,
  toId: string
) {
  if (table === "order_items") {
    const { error } = await supabase
      .from(table)
      .update({ product_id: toId })
      .eq("product_id", fromId);
    if (error) {
      if (/permission|rls|policy|does not exist|schema cache/i.test(error.message)) {
        console.warn(`${table} übersprungen: ${error.message}`);
        return;
      }
      throw new Error(`${table}: ${error.message}`);
    }
    return;
  }

  const { data, error } = await supabase
    .from(table)
    .select("id, user_id")
    .eq("product_id", fromId);
  if (error) {
    if (/permission|rls|policy|does not exist|schema cache/i.test(error.message)) {
      console.warn(`${table} übersprungen: ${error.message}`);
      return;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  for (const row of data ?? []) {
    const existing = await supabase
      .from(table)
      .select("id")
      .eq("user_id", row.user_id)
      .eq("product_id", toId)
      .maybeSingle();
    if (existing.error) throw new Error(`${table}: ${existing.error.message}`);
    if (existing.data) {
      const removed = await supabase.from(table).delete().eq("id", row.id);
      if (removed.error) throw new Error(`${table}: ${removed.error.message}`);
    } else {
      const moved = await supabase.from(table).update({ product_id: toId }).eq("id", row.id);
      if (moved.error) throw new Error(`${table}: ${moved.error.message}`);
    }
  }
}

async function applyDeletes(supabase: SupabaseClient, plan: PlanRow[]) {
  const doomed = plan.filter((row) => row.action === "loeschen");
  for (const row of doomed) {
    if (!row.keeper_id || row.keeper_id === row.id) {
      throw new Error(`Kein Behalt-Ziel für ${row.id}`);
    }
    for (const table of RELATIONS) {
      await migrateProductId(supabase, table, row.id, row.keeper_id);
    }
    const removed = await supabase.from("products").delete().eq("id", row.id).select("id");
    if (removed.error) throw new Error(`products ${row.id}: ${removed.error.message}`);
    if (!removed.data?.length) {
      throw new Error(
        `Löschen von ${row.id} hatte keine Wirkung. Der Schlüssel darf Produkte nicht löschen. Abbruch, weitere Zeilen bleiben unverändert.`
      );
    }
    console.log(`gelöscht ${row.id} → behalten ${row.keeper_id}`);
  }
}

function writeCsv(plan: PlanRow[], file: string) {
  const header = [
    "group",
    "action",
    "keeper_id",
    "id",
    "name_ar",
    "name_de",
    "image_url",
    "created_at",
    "barcode",
    "product_number",
    "deleted_at",
    "match",
    "reason",
  ];
  const lines = [header.join(",")];
  for (const row of plan) {
    lines.push(
      [
        String(row.group),
        row.action,
        row.keeper_id,
        row.id,
        row.name_ar,
        row.name_de,
        row.image_url,
        row.created_at,
        row.barcode,
        row.product_number,
        row.deleted_at,
        row.match,
        row.reason,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  mkdirSync(new URL("./output/", import.meta.url), { recursive: true });
  writeFileSync(file, `\uFEFF${lines.join("\n")}\n`, "utf8");
}

async function main() {
  loadEnv(".env.local");
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || (!serviceKey && !anonKey)) {
    console.error("NEXT_PUBLIC_SUPABASE_URL und ein Schlüssel fehlen in .env.local");
    process.exit(1);
  }

  const mode = serviceKey ? "service-role" : "anon";
  const supabase = createClient(url, serviceKey || anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(apply ? "MODUS: ANWENDEN" : "MODUS: DRY-RUN (nichts wird gelöscht)");
  console.log(`Zugang: ${mode}`);

  const { rows, source } = await fetchProducts(supabase);
  console.log(`Gelesen: ${rows.length} Produkte aus ${source}`);

  const groups = buildGroups(rows);
  const plan = groups.flatMap((group, index) => planGroup(group, index + 1));
  const deletes = plan.filter((row) => row.action === "loeschen");
  const reviews = plan.filter((row) => row.action === "pruefen");
  const multiImageGroups = new Set(
    plan.filter((row) => row.reason.includes("Mehrere Einträge haben ein Bild")).map((row) => row.group)
  );

  const csvPath = new URL("./output/duplicate-products-dry-run.csv", import.meta.url);
  writeCsv(plan, csvPath.pathname);

  console.log("");
  console.log(`Gruppen mit mehr als einem Eintrag: ${groups.length}`);
  console.log(`Würden gelöscht (ohne Bild): ${deletes.length}`);
  console.log(`Bleiben, weil ein Bild vorhanden ist: ${plan.filter((row) => row.action === "behalten").length}`);
  console.log(`Unklare Gruppen (kein Bild in der Gruppe): ${new Set(reviews.map((row) => row.group)).size}`);
  console.log(`Gruppen mit mehreren bebilderten Einträgen: ${multiImageGroups.size}`);
  console.log(`CSV: ${csvPath.pathname}`);

  const counts = deletes.length
    ? await relationCounts(
        supabase,
        deletes.map((row) => row.id)
      )
    : { order_items: 0, cart_items: 0, wishlist_items: 0 };
  console.log("");
  console.log("Verknüpfungen der Lösch-Kandidaten (würden auf die ID mit Bild umgehängt):");
  for (const table of RELATIONS) {
    const value = counts[table];
    console.log(
      value === null
        ? `  ${table}: nicht lesbar mit diesem Schlüssel`
        : `  ${table}: ${value}`
    );
  }

  console.log("");
  console.log("id | name_ar | name_de | image_url | created_at");
  const groupIds = [...new Set(plan.map((row) => row.group))];
  for (const groupNo of groupIds) {
    const members = plan.filter((row) => row.group === groupNo);
    console.log("");
    console.log(`--- Gruppe ${groupNo} | ${members[0]?.match ?? ""} ---`);
    for (const row of members) {
      const label =
        row.action === "loeschen" ? "LÖSCHEN " : row.action === "behalten" ? "BEHALTEN" : "PRÜFEN ";
      console.log(
        `${label} | ${row.id} | ${row.name_ar} | ${row.name_de} | ${row.image_url || "(leer)"} | ${row.created_at}`
      );
    }
  }

  if (reviews.length) {
    console.log("");
    console.log("Nicht angefasst, weil kein Eintrag der Gruppe ein Bild hat:");
    for (const row of reviews) {
      console.log(`Gruppe ${row.group} | ${row.id} | ${row.name_ar || row.name_de} | ${row.created_at}`);
    }
  }

  if (!apply) {
    console.log("");
    console.log("Dry-Run beendet. Es wurde nichts gelöscht.");
    return;
  }

  const unsafe = deletes.filter((row) => row.image_url.length > 0 || !row.keeper_id);
  const keeperMissingImage = deletes.filter((row) => {
    const keeper = plan.find((item) => item.id === row.keeper_id);
    return !keeper || keeper.image_url.length === 0 || keeper.action !== "behalten";
  });
  if (unsafe.length > 0 || keeperMissingImage.length > 0) {
    console.error("Abbruch: ein Löschkandidat hat ein Bild oder kein Behalt-Ziel mit Bild.");
    process.exit(1);
  }

  const doomedIds = new Set(deletes.map((row) => row.id));
  const backup = rows.filter((row) => doomedIds.has(row.id));
  const backupPath = new URL("./output/duplicate-products-backup.json", import.meta.url);
  mkdirSync(new URL("./output/", import.meta.url), { recursive: true });
  writeFileSync(
    backupPath,
    JSON.stringify({ createdAt: new Date().toISOString(), count: backup.length, products: backup }, null, 2)
  );
  console.log(`Backup: ${backupPath.pathname}`);
  if (!serviceKey) {
    console.log("Kein Service-Role-Schlüssel. Löschen läuft mit dem vorhandenen Schlüssel und wird pro Zeile geprüft.");
  }
  await applyDeletes(supabase, plan);
  console.log(`Fertig. Gelöscht: ${deletes.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
