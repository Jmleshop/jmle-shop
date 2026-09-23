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
