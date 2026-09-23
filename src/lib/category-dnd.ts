import type { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { FoodCategory } from "@/types";

export const CATEGORY_MAX_DEPTH = 2;
export const CATEGORY_INDENT_PX = 28;

export type FlatCategory = FoodCategory & {
  depth: number;
  index: number;
  parentId: string | null;
};

export function flattenCategories(
  all: FoodCategory[],
  expanded: Set<string>,
  activeId?: UniqueIdentifier | null
): FlatCategory[] {
  const active = all.filter((c) => !c.deleted_at);
  const byParent = new Map<string | null, FoodCategory[]>();
  for (const c of active) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar));
  }

  const skip = new Set<string>();
  if (activeId) {
    collectDescendants(String(activeId), byParent, skip);
  }

  const out: FlatCategory[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of byParent.get(parentId) ?? []) {
      if (skip.has(c.id)) continue;
      out.push({
        ...c,
        depth,
        index: out.length,
        parentId,
      });
      const kids = byParent.get(c.id) ?? [];
      if (kids.length > 0 && expanded.has(c.id) && c.id !== activeId) {
        walk(c.id, depth + 1);
      }
    }
  };
  walk(null, 0);
  return out.map((item, index) => ({ ...item, index }));
}

function collectDescendants(
  id: string,
  byParent: Map<string | null, FoodCategory[]>,
  into: Set<string>
) {
  for (const child of byParent.get(id) ?? []) {
    into.add(child.id);
    collectDescendants(child.id, byParent, into);
  }
}

export function maxDescendantRelativeDepth(id: string, all: FoodCategory[]): number {
  const active = all.filter((c) => !c.deleted_at);
  let max = 0;
  const walk = (parentId: string, rel: number) => {
    for (const child of active.filter((c) => c.parent_id === parentId)) {
      max = Math.max(max, rel);
      walk(child.id, rel + 1);
    }
  };
  walk(id, 1);
  return max;
}

export function getProjection(
  items: FlatCategory[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  offsetLeft: number,
  all: FoodCategory[]
) {
  const overIndex = items.findIndex((item) => item.id === overId);
  const activeIndex = items.findIndex((item) => item.id === activeId);
  if (overIndex < 0 || activeIndex < 0) return null;

  const activeItem = items[activeIndex];
  const newItems = arrayMove(items, activeIndex, overIndex);
  const previousItem = newItems[overIndex - 1];
  const nextItem = newItems[overIndex + 1];
  const dragDepth = Math.round(offsetLeft / CATEGORY_INDENT_PX);
  const projectedDepth = activeItem.depth + dragDepth;
  const descendantRel = maxDescendantRelativeDepth(String(activeId), all);
  const depthCap = CATEGORY_MAX_DEPTH - descendantRel;

  const maxDepth = previousItem ? Math.min(previousItem.depth + 1, depthCap) : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  let depth = projectedDepth;
  if (depth > maxDepth) depth = maxDepth;
  if (depth < minDepth) depth = minDepth;
  depth = Math.max(0, Math.min(depth, depthCap));

  return {
    depth,
    parentId: parentForDepth(newItems, overIndex, depth, previousItem),
  };
}

function parentForDepth(
  items: FlatCategory[],
  overIndex: number,
  depth: number,
  previousItem?: FlatCategory
): string | null {
  if (depth === 0 || !previousItem) return null;
  if (depth === previousItem.depth) return previousItem.parentId;
  if (depth > previousItem.depth) return previousItem.id;
  const ancestor = items
    .slice(0, overIndex)
    .reverse()
    .find((item) => item.depth === depth);
  return ancestor?.parentId ?? null;
}

export function buildPersistOrder(
  items: FlatCategory[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  projected: { depth: number; parentId: string | null }
): { id: string; parent_id: string | null; sort_order: number }[] {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);
  if (activeIndex < 0 || overIndex < 0) return [];

  const next = arrayMove(items, activeIndex, overIndex).map((item) =>
    item.id === activeId
      ? { ...item, depth: projected.depth, parentId: projected.parentId }
      : item
  );

  const siblingCount = new Map<string, number>();
  const order: { id: string; parent_id: string | null; sort_order: number }[] = [];

  for (const item of next) {
    const parentKey = item.parentId ?? "";
    const sort = siblingCount.get(parentKey) ?? 0;
    siblingCount.set(parentKey, sort + 1);
    order.push({
      id: item.id,
      parent_id: item.parentId,
      sort_order: sort,
    });
  }

  return order;
}
