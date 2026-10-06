"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createHomepageSection } from "@/lib/homepage-sections";
import type { HomepageSection, HomepageSectionType } from "@/types";

type SlideMeta = {
  id: string;
  title?: string;
  image?: string;
  slider_zone?: string;
};

function SortableSectionRow({
  section,
  de,
  expanded,
  onToggle,
  onMove,
  onToggleActive,
  onRemove,
  children,
}: {
  section: HomepageSection;
  de: boolean;
  expanded: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggleActive: () => void;
  onRemove?: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const label =
    section.titleAr ||
    section.title ||
    section.titleDe ||
    section.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white",
        isDragging && "opacity-70 shadow-md z-10"
      )}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          className="cursor-grab touch-none p-1 text-zinc-400 hover:text-zinc-700"
          aria-label="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-start text-xs font-medium text-zinc-800 truncate"
        >
          <span className="text-zinc-400 me-1 uppercase text-[10px]">
            {section.type}
          </span>
          {label}
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          className="p-1 text-zinc-400 hover:text-zinc-700"
          title={section.active === false ? (de ? "Einblenden" : "إظهار") : de ? "Ausblenden" : "إخفاء"}
        >
          {section.active === false ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          type="button"
          onClick={() => onMove(-1)}
          className="p-1 text-zinc-400 hover:text-zinc-700"
          aria-label="Up"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          className="p-1 text-zinc-400 hover:text-zinc-700"
          aria-label="Down"
        >
          <ChevronDown size={14} />
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600"
            aria-label="Delete"
            title={de ? "Sektion entfernen" : "إزالة القسم"}
          >
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>
      {expanded && children ? (
        <div className="border-t border-zinc-100 bg-zinc-50/80 px-2 py-2 space-y-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function BuilderStructurePanel({
  de,
  sections,
  slideOrders,
  slides,
  onChangeSections,
  onChangeSlideOrders,
  onTitleChange,
  sectionTitles,
}: {
  de: boolean;
  sections: HomepageSection[];
  slideOrders: Record<string, string[]>;
  slides: SlideMeta[];
  onChangeSections: (next: HomepageSection[]) => void;
  onChangeSlideOrders: (next: Record<string, string[]>) => void;
  onTitleChange: (sectionId: string, lang: "ar" | "de", value: string) => void;
  sectionTitles: Record<string, { ar?: string; de?: string }>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ordered = useMemo(
    () => [...sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [sections]
  );

  const slidesById = useMemo(() => {
    const m = new Map<string, SlideMeta>();
    for (const s of slides) m.set(s.id, s);
    return m;
  }, [slides]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((s) => s.id === active.id);
    const newIndex = ordered.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(ordered, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sortOrder: i,
    }));
    onChangeSections(moved);
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = ordered.findIndex((s) => s.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ordered.length) return;
    const moved = arrayMove(ordered, idx, next).map((s, i) => ({
      ...s,
      sortOrder: i,
    }));
    onChangeSections(moved);
  };

  const moveSlide = (zone: string, id: string, dir: -1 | 1) => {
    const list = [...(slideOrders[zone] || [])];
    const idx = list.indexOf(id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= list.length) return;
    const swapped = arrayMove(list, idx, next);
    onChangeSlideOrders({ ...slideOrders, [zone]: swapped });
  };

  const addSection = (type: HomepageSectionType) => {
    const created = createHomepageSection(type, ordered.length);
    if (type === "slider" || type === "single") {
      created.title = de ? "Neue Banner-Sektion" : "قسم بانر جديد";
    } else if (type === "brands") {
      created.title = de ? "Marken" : "العلامات";
    } else if (type === "categories") {
      created.title = de ? "Kategorien" : "الفئات";
    } else {
      created.title = de ? "Angebote" : "عروض";
    }
    onChangeSections([...ordered, created]);
  };

  const removeSection = (id: string) => {
    if (ordered.length <= 1) return;
    if (
      !confirm(
        de
          ? "Sektion aus dem Entwurf entfernen? (Live erst nach Veröffentlichen)"
          : "إزالة القسم من المسودة؟ (يظهر بعد النشر)"
      )
    ) {
      return;
    }
    onChangeSections(
      ordered.filter((s) => s.id !== id).map((s, i) => ({ ...s, sortOrder: i }))
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {de
          ? "Sektionen per Drag-and-Drop sortieren. Neu/Löschen wirkt nach Veröffentlichen. Banner-Bilder im Tab Banner."
          : "رتّب الأقسام بالسحب. الإضافة/الحذف بعد النشر. صور البانر من تبويب البانر."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => addSection("slider")}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Plus size={12} />
          {de ? "Banner" : "بانر"}
        </button>
        <select
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[11px]"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as HomepageSectionType | "";
            if (v) addSection(v);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            {de ? "Andere…" : "أخرى…"}
          </option>
          <option value="single">{de ? "Einzelbanner" : "بانر واحد"}</option>
          <option value="brands">{de ? "Marken" : "علامات"}</option>
          <option value="products">{de ? "Produkte" : "منتجات"}</option>
          <option value="categories">{de ? "Kategorien" : "فئات"}</option>
        </select>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={ordered.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {ordered.map((section) => {
              const zone = section.zone || section.id;
              const isSlider =
                section.type === "slider" || section.type === "single";
              const zoneSlides = isSlider
                ? (slideOrders[zone] || []).map((id) => slidesById.get(id)).filter(Boolean) as SlideMeta[]
                : [];
              const titles = sectionTitles[section.id] || {};
              return (
                <SortableSectionRow
                  key={section.id}
                  section={section}
                  de={de}
                  expanded={expandedId === section.id}
                  onToggle={() =>
                    setExpandedId((cur) =>
                      cur === section.id ? null : section.id
                    )
                  }
                  onMove={(dir) => moveSection(section.id, dir)}
                  onToggleActive={() => {
                    onChangeSections(
                      ordered.map((s) =>
                        s.id === section.id
                          ? { ...s, active: s.active === false }
                          : s
                      )
                    );
                  }}
                  onRemove={
                    ordered.length > 1
                      ? () => removeSection(section.id)
                      : undefined
                  }
                >
                  <div className="space-y-2">
                    <label className="block text-[11px] text-zinc-600">
                      {de ? "Titel (AR)" : "العنوان (عربي)"}
                      <input
                        type="text"
                        value={titles.ar ?? section.titleAr ?? section.title ?? ""}
                        onChange={(e) =>
                          onTitleChange(section.id, "ar", e.target.value)
                        }
                        className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs"
                      />
                    </label>
                    <label className="block text-[11px] text-zinc-600">
                      {de ? "Titel (DE)" : "العنوان (ألماني)"}
                      <input
                        type="text"
                        value={titles.de ?? section.titleDe ?? ""}
                        onChange={(e) =>
                          onTitleChange(section.id, "de", e.target.value)
                        }
                        className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs"
                      />
                    </label>
                    {isSlider && zoneSlides.length > 0 && (
                      <ul className="space-y-1 pt-1">
                        <li className="text-[10px] uppercase tracking-wide text-zinc-400">
                          Slides · {zone}
                        </li>
                        {zoneSlides.map((slide) => (
                          <li
                            key={slide.id}
                            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {slide.image ? (
                              <img
                                src={slide.image}
                                alt=""
                                className="h-8 w-12 rounded object-cover"
                              />
                            ) : (
                              <span className="h-8 w-12 rounded bg-zinc-100" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-700">
                              {slide.title || slide.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => moveSlide(zone, slide.id, -1)}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSlide(zone, slide.id, 1)}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </SortableSectionRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
