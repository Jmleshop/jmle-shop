import type { FoodCategory } from "@/types";

export function categoryDepth(cat: FoodCategory, all: FoodCategory[]): number {
  let d = 1;
  let pid = cat.parent_id;
  const seen = new Set<string>();
  while (pid && !seen.has(pid)) {
    seen.add(pid);
    d += 1;
    pid = all.find((c) => c.id === pid)?.parent_id ?? null;
  }
  return d;
}

export function sortedCategories(all: FoodCategory[]): FoodCategory[] {
  const active = all.filter((c) => !c.deleted_at);
  const byParent = new Map<string | null, FoodCategory[]>();
  for (const c of active) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  const out: FoodCategory[] = [];
  const walk = (parentId: string | null) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(null);
  return out;
}

export function categoryLabel(c: FoodCategory): string {
  return c.name_de?.trim() || c.name_ar;
}

type TreeRow = { id: string; parent_id: string | null; deleted_at?: string | null };

/**
 * Nur Kategorien, deren komplette Elternkette aktiv ist. Unterkategorien
 * einer gelöschten Oberkategorie („Waisen“) fallen weg — sonst tauchen sie
 * im Shop und Admin plötzlich als Hauptkategorien auf.
 */
export function withoutOrphans<T extends TreeRow>(rows: T[]): T[] {
  const active = rows.filter((c) => !c.deleted_at);
  const byParent = new Map<string | null, T[]>();
  for (const c of active) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const keep = new Set<string>();
  const walk = (parentId: string | null) => {
    for (const c of byParent.get(parentId) ?? []) {
      if (keep.has(c.id)) continue;
      keep.add(c.id);
      walk(c.id);
    }
  };
  walk(null);
  return active.filter((c) => keep.has(c.id));
}

/** Alle Nachkommen-IDs (Kinder, Enkel, …) einer Kategorie. */
export function descendantIds(
  rows: Pick<TreeRow, "id" | "parent_id">[],
  rootId: string
): string[] {
  const out: string[] = [];
  const seen = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const pid = queue.shift()!;
    for (const c of rows) {
      if (c.parent_id === pid && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c.id);
        queue.push(c.id);
      }
    }
  }
  return out;
}
