import * as XLSX from "xlsx";
import type { FoodCategory } from "@/types";

/** Canonical Excel/CSV columns for category import/export */
export const CATEGORY_EXCEL_HEADERS = [
  "ID",
  "Name_DE",
  "Name_AR",
  "Slug",
  "Typ",
  "Is_Parent",
  "Parent_ID",
  "Uebergeordnete_Kategorie",
  "Show_On_Homepage",
  "Sort_Order",
  "Image_URL",
] as const;

export type CategoryExcelHeader = (typeof CATEGORY_EXCEL_HEADERS)[number];

export type CategoryExcelRow = {
  id: string;
  name_de: string;
  name_ar: string;
  slug: string;
  typ: string;
  is_parent: boolean;
  parent_id: string;
  parent_name: string;
  show_on_homepage: boolean;
  sort_order: number;
  image_url: string;
};

export type CategoryImportIssue = { row: number; message: string };

export type CategoryImportPlanItem = {
  row: number;
  action: "update" | "create";
  id: string;
  payload: {
    id: string;
    name_ar: string;
    name_de: string;
    image: string | null;
    sort_order: number;
    parent_id: string | null;
    show_on_homepage: boolean;
  };
};

export type CategoryImportPlan = {
  updates: CategoryImportPlanItem[];
  creates: CategoryImportPlanItem[];
  issues: CategoryImportIssue[];
};

const HEADER_ALIASES: Record<string, keyof CategoryExcelRow | "skip"> = {
  id: "id",
  "eindeutige id": "id",
  kategorie_id: "id",
  name_de: "name_de",
  "name (de)": "name_de",
  name_deutsch: "name_de",
  namen_de: "name_de",
  name_ar: "name_ar",
  "name (ar)": "name_ar",
  name_arabisch: "name_ar",
  namen_ar: "name_ar",
  slug: "slug",
  "url-pfad": "slug",
  url_pfad: "slug",
  urlpfad: "slug",
  pfad: "slug",
  typ: "typ",
  type: "typ",
  is_parent: "is_parent",
  isparent: "is_parent",
  hauptkategorie: "is_parent",
  parent_id: "parent_id",
  parentid: "parent_id",
  uebergeordnete_kategorie: "parent_name",
  übergeordnete_kategorie: "parent_name",
  "übergeordnete kategorie": "parent_name",
  uebergeordnete_kategorie_id: "parent_id",
  parent_name: "parent_name",
  parent: "parent_name",
  show_on_homepage: "show_on_homepage",
  homepage: "show_on_homepage",
  startseite: "show_on_homepage",
  sort_order: "sort_order",
  sortorder: "sort_order",
  reihenfolge: "sort_order",
  position: "sort_order",
  image_url: "image_url",
  image: "image_url",
  bild: "image_url",
  bild_url: "image_url",
  bild_link: "image_url",
};

function normalizeHeader(raw: string): string {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[\s/-]+/g, "_");
}

export function slugifyCategoryId(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || `cat-${Date.now().toString(36)}`;
}

function parseBool(value: unknown, fallback = true): boolean {
  if (value == null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "ja", "y", "x", "wahr"].includes(s)) return true;
  if (["false", "0", "no", "nein", "n", "falsch"].includes(s)) return false;
  return fallback;
}

function parseTyp(value: unknown): { isParent: boolean | null; typ: string } {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return { isParent: null, typ: "" };
  if (
    /haupt|parent|main|root|ober/.test(s) ||
    s === "true" ||
    s === "1"
  ) {
    return { isParent: true, typ: "Hauptkategorie" };
  }
  if (/unter|sub|child|false|0/.test(s)) {
    return { isParent: false, typ: "Unterkategorie" };
  }
  return { isParent: null, typ: String(value ?? "").trim() };
}

function cellStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

/** Map DB categories → export rows (display Sort_Order as 1-based) */
export function categoriesToExcelRows(categories: FoodCategory[]): CategoryExcelRow[] {
  const active = categories.filter((c) => !c.deleted_at);
  const byId = new Map(active.map((c) => [c.id, c]));
  const sorted = [...active].sort((a, b) => {
    const pa = a.parent_id ?? "";
    const pb = b.parent_id ?? "";
    if (pa !== pb) {
      if (!pa) return -1;
      if (!pb) return 1;
      return pa.localeCompare(pb);
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id);
  });

  return sorted.map((c) => {
    const isParent = !c.parent_id;
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    return {
      id: c.id,
      name_de: c.name_de || "",
      name_ar: c.name_ar || "",
      slug: c.id,
      typ: isParent ? "Hauptkategorie" : "Unterkategorie",
      is_parent: isParent,
      parent_id: c.parent_id || "",
      parent_name: parent?.name_de || parent?.name_ar || "",
      show_on_homepage: c.show_on_homepage !== false,
      sort_order: (c.sort_order ?? 0) + 1,
      image_url: c.image || "",
    };
  });
}

function rowsToAoA(rows: CategoryExcelRow[]): (string | number | boolean)[][] {
  const header = [...CATEGORY_EXCEL_HEADERS];
  const body = rows.map((r) => [
    r.id,
    r.name_de,
    r.name_ar,
    r.slug,
    r.typ,
    r.is_parent ? "TRUE" : "FALSE",
    r.parent_id,
    r.parent_name,
    r.show_on_homepage ? "TRUE" : "FALSE",
    r.sort_order,
    r.image_url,
  ]);
  return [header, ...body];
}

export function buildCategoryWorkbook(rows: CategoryExcelRow[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rowsToAoA(rows));
  ws["!cols"] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Kategorien");
  return wb;
}

export function categoryWorkbookToBuffer(wb: XLSX.WorkBook): Buffer {
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(out);
}

export function categoriesToCsv(categories: FoodCategory[]): string {
  const rows = categoriesToExcelRows(categories);
  const aoa = rowsToAoA(rows);
  return aoa
    .map((line) =>
      line
        .map((v) => {
          const text = v == null ? "" : String(v);
          if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
          return text;
        })
        .join(",")
    )
    .join("\n");
}

export function categoryTemplateRows(): CategoryExcelRow[] {
  return [
    {
      id: "beispiel-gewuerze",
      name_de: "Gewürze",
      name_ar: "بهارات",
      slug: "beispiel-gewuerze",
      typ: "Hauptkategorie",
      is_parent: true,
      parent_id: "",
      parent_name: "",
      show_on_homepage: true,
      sort_order: 1,
      image_url: "https://example.com/gewuerze.jpg",
    },
    {
      id: "beispiel-saefte",
      name_de: "Säfte",
      name_ar: "عصائر",
      slug: "beispiel-saefte",
      typ: "Unterkategorie",
      is_parent: false,
      parent_id: "beispiel-gewuerze",
      parent_name: "Gewürze",
      show_on_homepage: false,
      sort_order: 1,
      image_url: "",
    },
  ];
}

function mapSheetRows(rawRows: Record<string, unknown>[]): CategoryExcelRow[] {
  return rawRows.map((raw) => {
    const mapped: Partial<Record<keyof CategoryExcelRow, unknown>> = {};
    for (const [key, value] of Object.entries(raw)) {
      const norm = normalizeHeader(key);
      const field = HEADER_ALIASES[norm];
      if (!field || field === "skip") continue;
      mapped[field] = value;
    }

    const typInfo = parseTyp(mapped.typ ?? mapped.is_parent);
    const isParentExplicit =
      mapped.is_parent != null && String(mapped.is_parent).trim() !== ""
        ? parseBool(mapped.is_parent, true)
        : typInfo.isParent;

    const sortRaw = Number(mapped.sort_order);
    const sort_order = Number.isFinite(sortRaw) && sortRaw > 0 ? Math.floor(sortRaw) : 1;

    return {
      id: cellStr(mapped.id),
      name_de: cellStr(mapped.name_de),
      name_ar: cellStr(mapped.name_ar),
      slug: cellStr(mapped.slug),
      typ: typInfo.typ || (isParentExplicit === false ? "Unterkategorie" : "Hauptkategorie"),
      is_parent: isParentExplicit !== false && !cellStr(mapped.parent_id) && !cellStr(mapped.parent_name)
        ? true
        : isParentExplicit === true
          ? true
          : isParentExplicit === false
            ? false
            : !cellStr(mapped.parent_id) && !cellStr(mapped.parent_name),
      parent_id: cellStr(mapped.parent_id),
      parent_name: cellStr(mapped.parent_name),
      show_on_homepage: parseBool(mapped.show_on_homepage, true),
      sort_order,
      image_url: cellStr(mapped.image_url),
    };
  });
}

/** Parse .xlsx or .csv buffer/text into normalized rows */
export function parseCategoryExcelFile(
  input: ArrayBuffer | Buffer | Uint8Array | string,
  filename = "upload.xlsx"
): CategoryExcelRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") && typeof input === "string") {
    const wb = XLSX.read(input, { type: "string", FS: "," });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    return mapSheetRows(json);
  }

  const data =
    typeof input === "string"
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : input;

  const wb = XLSX.read(data, {
    type: typeof input === "string" ? "string" : "array",
    cellDates: false,
  });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return mapSheetRows(json);
}

function resolveParentId(
  row: CategoryExcelRow,
  existingById: Map<string, FoodCategory>,
  existingByName: Map<string, string>,
  pendingIds: Set<string>
): { parent_id: string | null; error?: string } {
  if (row.is_parent && !row.parent_id && !row.parent_name) {
    return { parent_id: null };
  }
  if (row.parent_id) {
    if (existingById.has(row.parent_id) || pendingIds.has(row.parent_id)) {
      return { parent_id: row.parent_id };
    }
    return {
      parent_id: null,
      error: `Parent_ID „${row.parent_id}“ nicht gefunden`,
    };
  }
  if (row.parent_name) {
    const key = row.parent_name.trim().toLowerCase();
    const hit = existingByName.get(key);
    if (hit) return { parent_id: hit };
    return {
      parent_id: null,
      error: `Übergeordnete Kategorie „${row.parent_name}“ nicht gefunden`,
    };
  }
  return { parent_id: null };
}

/**
 * Build create/update plan. Parents are ordered before children.
 * Sort_Order in Excel is 1-based → stored 0-based.
 */
export function planCategoryImport(
  rows: CategoryExcelRow[],
  existing: FoodCategory[]
): CategoryImportPlan {
  const active = existing.filter((c) => !c.deleted_at);
  const existingById = new Map(active.map((c) => [c.id, c]));
  const existingByName = new Map<string, string>();
  for (const c of active) {
    if (c.name_de) existingByName.set(c.name_de.trim().toLowerCase(), c.id);
    if (c.name_ar) existingByName.set(c.name_ar.trim().toLowerCase(), c.id);
  }

  const issues: CategoryImportIssue[] = [];
  const prepared: Array<{
    row: number;
    id: string;
    action: "update" | "create";
    name_ar: string;
    name_de: string;
    image: string | null;
    sort_order: number;
    show_on_homepage: boolean;
    parent_id_raw: string;
    parent_name: string;
    is_parent: boolean;
  }> = [];

  const usedIds = new Set(existingById.keys());
  const pendingIds = new Set<string>();

  rows.forEach((row, index) => {
    const excelRow = index + 2; // header = 1
    const name_ar = row.name_ar.trim();
    const name_de = row.name_de.trim();
    if (!name_ar && !name_de) {
      issues.push({ row: excelRow, message: "Name_AR oder Name_DE ist Pflicht" });
      return;
    }
    if (!name_ar) {
      issues.push({
        row: excelRow,
        message: "Name_AR ist Pflicht (arabischer Name)",
      });
      return;
    }

    let id = row.id.trim() || row.slug.trim();
    const action: "update" | "create" = id && existingById.has(id) ? "update" : "create";

    if (!id) {
      id = slugifyCategoryId(name_de || name_ar);
      let candidate = id;
      let n = 2;
      while (usedIds.has(candidate) || pendingIds.has(candidate)) {
        candidate = `${id}-${n++}`;
      }
      id = candidate;
    } else if (action === "create" && (usedIds.has(id) || pendingIds.has(id))) {
      issues.push({
        row: excelRow,
        message: `ID „${id}“ ist bereits vergeben / doppelt in Datei`,
      });
      return;
    }

    pendingIds.add(id);
    usedIds.add(id);

    // Excel 1-based → DB 0-based
    const sort_order = Math.max(0, (row.sort_order || 1) - 1);

    prepared.push({
      row: excelRow,
      id,
      action,
      name_ar,
      name_de,
      image: row.image_url.trim() || null,
      sort_order,
      show_on_homepage: row.is_parent === false ? false : row.show_on_homepage,
      parent_id_raw: row.parent_id.trim(),
      parent_name: row.parent_name.trim(),
      is_parent: row.is_parent,
    });
  });

  // Resolve parents; process roots first then children (up to 3 passes)
  const updates: CategoryImportPlanItem[] = [];
  const creates: CategoryImportPlanItem[] = [];
  const remaining = [...prepared];
  const knownParents = new Set(existingById.keys());

  for (let pass = 0; pass < 6 && remaining.length; pass++) {
    let progressed = false;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const item = remaining[i];
      const resolved = resolveParentId(
        {
          id: item.id,
          name_de: item.name_de,
          name_ar: item.name_ar,
          slug: item.id,
          typ: item.is_parent ? "Hauptkategorie" : "Unterkategorie",
          is_parent: item.is_parent,
          parent_id: item.parent_id_raw,
          parent_name: item.parent_name,
          show_on_homepage: item.show_on_homepage,
          sort_order: item.sort_order + 1,
          image_url: item.image || "",
        },
        existingById,
        existingByName,
        knownParents
      );

      const needsParent = !item.is_parent || !!item.parent_id_raw || !!item.parent_name;
      if (needsParent && resolved.error && !item.is_parent) {
        // Wait for parent to be created in earlier pass
        if (pass < 5 && (item.parent_id_raw || item.parent_name)) {
          continue;
        }
        issues.push({ row: item.row, message: resolved.error });
        remaining.splice(i, 1);
        progressed = true;
        continue;
      }

      let parent_id = resolved.parent_id;
      if (item.is_parent && !item.parent_id_raw && !item.parent_name) {
        parent_id = null;
      }

      // Self-parent guard
      if (parent_id && parent_id === item.id) {
        issues.push({
          row: item.row,
          message: "Kategorie kann nicht sich selbst als Parent haben",
        });
        remaining.splice(i, 1);
        progressed = true;
        continue;
      }

      const planItem: CategoryImportPlanItem = {
        row: item.row,
        action: item.action,
        id: item.id,
        payload: {
          id: item.id,
          name_ar: item.name_ar,
          name_de: item.name_de,
          image: item.image,
          sort_order: item.sort_order,
          parent_id,
          show_on_homepage: parent_id ? false : item.show_on_homepage,
        },
      };

      if (item.action === "update") updates.push(planItem);
      else creates.push(planItem);

      knownParents.add(item.id);
      if (item.name_de) {
        existingByName.set(item.name_de.trim().toLowerCase(), item.id);
      }
      if (item.name_ar) {
        existingByName.set(item.name_ar.trim().toLowerCase(), item.id);
      }
      remaining.splice(i, 1);
      progressed = true;
    }
    if (!progressed) break;
  }

  for (const left of remaining) {
    issues.push({
      row: left.row,
      message: "Hierarchie konnte nicht aufgelöst werden (Parent fehlt)",
    });
  }

  return { updates, creates, issues };
}
