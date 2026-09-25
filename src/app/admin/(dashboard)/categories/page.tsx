"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ChevronDown, ChevronRight, GripVertical, Pencil, Plus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import ImageUpload from "@/components/admin/ImageUpload";
import SwipeToDeleteRow from "@/components/admin/SwipeToDeleteRow";
import { softDeleteWithUndo } from "@/lib/admin-soft-delete";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import {
  CATEGORY_INDENT_PX,
  buildPersistOrder,
  flattenCategories,
  getProjection,
  type FlatCategory,
} from "@/lib/category-dnd";
import { categoryDepth, categoryLabel } from "@/lib/category-tree";
import type { FoodCategory } from "@/types";

function SortableCategoryRow({
  item,
  projectedDepth,
  hasChildren,
  open,
  toggle,
  onEdit,
  onArchive,
  onSwipeTrash,
  trashLabel,
  selected,
  onToggleSelect,
}: {
  item: FlatCategory;
  projectedDepth?: number;
  hasChildren: boolean;
  open: boolean;
  toggle: (id: string) => void;
  onEdit: (c: FoodCategory) => void;
  onArchive: (id: string) => void;
  onSwipeTrash: (c: FoodCategory) => boolean | void | Promise<boolean | void>;
  trashLabel: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const depth = projectedDepth ?? item.depth;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: depth * CATEGORY_INDENT_PX,
        opacity: isDragging ? 0.45 : 1,
      }}
      className="border-b last:border-0 bg-white"
    >
      <SwipeToDeleteRow
        disabled={!!item.deleted_at}
        label={trashLabel}
        onSwipeDelete={() => onSwipeTrash(item)}
      >
        <div className="flex items-center gap-2 py-3 pr-2 bg-white min-h-[52px]">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`${categoryLabel(item)} auswählen`}
            className="shrink-0 w-4 h-4 accent-gold ms-2"
          />
          <button
            type="button"
            className="cursor-grab text-gray-400 p-2 min-h-11 min-w-11 inline-flex items-center justify-center"
            {...attributes}
            {...listeners}
            aria-label="Ziehen zum Sortieren"
          >
            <GripVertical size={16} />
          </button>
          {hasChildren ? (
            <button
              type="button"
              className="p-2 min-h-11 min-w-11"
              onClick={() => toggle(item.id)}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="flex-1 font-medium text-sm">{categoryLabel(item)}</span>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Ebene {depth + 1}
          </span>
          <span className="text-xs text-gray-400 hidden md:inline" dir="rtl">
            {item.name_ar}
          </span>
          <button
            type="button"
            className="p-2.5 min-h-11 min-w-11"
            onClick={() => onEdit(item)}
            aria-label="Bearbeiten"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="p-2.5 min-h-11 min-w-11"
            onClick={() => onArchive(item.id)}
            aria-label={trashLabel}
          >
            <Archive size={14} />
          </button>
        </div>
      </SwipeToDeleteRow>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const { t } = useAdminI18n();
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name_ar: "",
    name_de: "",
    image: "",
    parent_id: "",
    kind: "main" as "main" | "sub",
  });
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} ${t("categories")} in den Papierkorb verschieben?`))
      return;
    const ids = [...selected];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/categories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        })
      )
    );
    setSelected(new Set());
    load();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const load = () => {
    fetch("/api/admin/categories?archived=true")
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.categories ?? []) as FoodCategory[];
        setCategories(rows);
        setExpanded((prev) => {
          if (prev.size > 0) return prev;
          return new Set(rows.filter((c) => !c.deleted_at).map((c) => c.id));
        });
      });
  };

  useEffect(() => {
    load();
  }, []);

  const flattened = useMemo(
    () => flattenCategories(categories, expanded, activeId),
    [categories, expanded, activeId]
  );

  const projected =
    activeId && overId
      ? getProjection(flattened, activeId, overId, offsetLeft, categories)
      : null;

  const activeItem = flattened.find((item) => item.id === activeId);

  const indentLabel = (c: FoodCategory) => {
    const d = categoryDepth(c, categories);
    return `${"— ".repeat(d - 1)}${categoryLabel(c)}`;
  };

  const openEdit = (c?: FoodCategory) => {
    if (c) {
      setEditingId(c.id);
      setForm({
        name_ar: c.name_ar,
        name_de: c.name_de,
        image: c.image ?? "",
        parent_id: c.parent_id ?? "",
        kind: c.parent_id ? "sub" : "main",
      });
    } else {
      setEditingId(null);
      setForm({ name_ar: "", name_de: "", image: "", parent_id: "", kind: "main" });
    }
    setShowForm(true);
    setError("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId
      ? `/api/admin/categories/${editingId}`
      : "/api/admin/categories";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        parent_id: form.kind === "sub" ? form.parent_id : "",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Fehler");
      return;
    }
    setShowForm(false);
    load();
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
    setOverId(active.id);
  };

  const onDragMove = ({ delta }: DragMoveEvent) => {
    setOffsetLeft(delta.x);
  };

  const onDragOver = ({ over }: DragOverEvent) => {
    setOverId(over?.id ?? null);
  };

  const resetDrag = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) {
      resetDrag();
      return;
    }
    const projection = getProjection(flattened, active.id, over.id, offsetLeft, categories);
    if (!projection) {
      resetDrag();
      return;
    }

    const order = buildPersistOrder(flattened, active.id, over.id, projection);
    const unchanged = order.every((row) => {
      const current = categories.find((c) => c.id === row.id);
      return (
        current &&
        (current.parent_id ?? null) === (row.parent_id ?? null) &&
        current.sort_order === row.sort_order
      );
    });
    if (unchanged) {
      resetDrag();
      return;
    }
    const optimistic = categories.map((c) => {
      const next = order.find((row) => row.id === c.id);
      return next ? { ...c, parent_id: next.parent_id, sort_order: next.sort_order } : c;
    });
    setCategories(optimistic);
    if (projection.parentId) {
      setExpanded((prev) => new Set(prev).add(projection.parentId as string));
    }
    resetDrag();

    await fetch("/api/admin/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    load();
  };

  const childIds = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) {
      if (c.deleted_at || !c.parent_id) continue;
      map.set(c.parent_id, (map.get(c.parent_id) ?? 0) + 1);
    }
    return map;
  }, [categories]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-semibold">{t("categories")}</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/trash"
            className="text-sm text-gray-600 hover:text-gold underline-offset-2 hover:underline min-h-11 inline-flex items-center"
          >
            {t("trash")} →
          </Link>
          <button className="btn-primary flex items-center gap-2 py-2.5 px-5" onClick={() => openEdit()}>
            <Plus size={18} />
            {t("newCategory")}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-2">
        Ziehen zum Sortieren. Nach rechts einrücken, um eine Unterkategorie zu erzeugen (max. 3
        Ebenen).
      </p>
      <p className="text-[11px] text-gray-400 mb-6">
        Zeile nach rechts wischen → Papierkorb (Soft Delete). Griff-Icon = Sortieren.
      </p>
      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between">
              <h2 className="font-semibold">{editingId ? t("edit") : t("newCategory")}</h2>
              <button type="button" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            <input required dir="rtl" className="input-field" placeholder={`${t("nameAr")} *`} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            <input className="input-field" placeholder={t("nameDe")} value={form.name_de} onChange={(e) => setForm({ ...form, name_de: e.target.value })} />
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("category")}</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cat-kind"
                  checked={form.kind === "main"}
                  onChange={() => setForm({ ...form, kind: "main", parent_id: "" })}
                />
                {t("mainCategory")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cat-kind"
                  checked={form.kind === "sub"}
                  onChange={() => setForm({ ...form, kind: "sub" })}
                />
                {t("subcategory")}
              </label>
            </div>
            {form.kind === "sub" && (
              <div>
                <label className="block text-sm mb-1">{t("parentCategory")}</label>
                <select
                  required
                  className="input-field"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                >
                  <option value="">—</option>
                  {categories
                    .filter((c) => !c.deleted_at && c.id !== editingId && categoryDepth(c, categories) < 3)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {indentLabel(c)}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <ImageUpload value={form.image} onChange={(v) => setForm({ ...form, image: Array.isArray(v) ? v[0] ?? "" : v })} folder="categories" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="btn-primary w-full">{t("save")}</button>
          </form>
        </div>
      )}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-xl bg-gold/10 border border-gold/30">
          <span className="text-sm font-medium">{selected.size} ausgewählt</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-3 py-2 rounded-xl border border-gray-300 text-sm min-h-11"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium inline-flex items-center gap-2 min-h-11"
            >
              <Trash2 size={16} />
              Ausgewählte löschen
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={resetDrag}
        >
          <SortableContext items={flattened.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {flattened.map((item) => (
              <SortableCategoryRow
                key={item.id}
                item={item}
                projectedDepth={
                  item.id === activeId && projected ? projected.depth : undefined
                }
                hasChildren={(childIds.get(item.id) ?? 0) > 0}
                open={expanded.has(item.id)}
                toggle={(id) => {
                  setExpanded((prev) => {
                    const n = new Set(prev);
                    if (n.has(id)) n.delete(id);
                    else n.add(id);
                    return n;
                  });
                }}
                onEdit={openEdit}
                onArchive={async (id) => {
                  if (!confirm(t("moveToTrashConfirm"))) return;
                  await fetch(`/api/admin/categories/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ archived: true }),
                  });
                  load();
                }}
                trashLabel={t("archive")}
                selected={selected.has(item.id)}
                onToggleSelect={toggleSelect}
                onSwipeTrash={async (c) => {
                  const name = c.name_de || c.name_ar || c.id;
                  return softDeleteWithUndo({
                    kind: "category",
                    id: c.id,
                    name,
                    onDone: load,
                  });
                }}
              />
            ))}
          </SortableContext>
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.4" } },
              }),
            }}
          >
            {activeItem ? (
              <div
                className="bg-white shadow-lg border rounded-xl px-3 py-3 font-medium text-sm"
                style={{ paddingLeft: (projected?.depth ?? activeItem.depth) * CATEGORY_INDENT_PX + 12 }}
              >
                {categoryLabel(activeItem)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        {flattened.length === 0 && (
          <p className="p-6 text-sm text-gray-500">Noch keine Kategorien.</p>
        )}
      </div>
    </div>
  );
}
