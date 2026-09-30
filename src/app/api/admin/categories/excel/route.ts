import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import type { FoodCategory } from "@/types";
import {
  buildCategoryWorkbook,
  categoriesToCsv,
  categoryTemplateRows,
  categoryWorkbookToBuffer,
  parseCategoryExcelFile,
  planCategoryImport,
} from "@/lib/admin-category-excel";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("categories");
  } catch {
    /* ignore */
  }
}

/** GET: export (.xlsx/.csv) or template */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") === "1";
  const format = (searchParams.get("format") || "xlsx").toLowerCase();

  try {
    const { categoriesToExcelRows } = await import(
      "@/lib/admin-category-excel"
    );

    if (template) {
      const templateRows = categoryTemplateRows();
      if (format === "csv") {
        const fakeCats: FoodCategory[] = templateRows.map((r) => ({
          id: r.id,
          name_ar: r.name_ar,
          name_de: r.name_de,
          image: r.image_url || null,
          sort_order: Math.max(0, r.sort_order - 1),
          parent_id: r.parent_id || null,
          show_on_homepage: r.show_on_homepage,
          deleted_at: null,
        }));
        const csv = categoriesToCsv(fakeCats);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="kategorien-vorlage.csv"',
          },
        });
      }
      const wb = buildCategoryWorkbook(templateRows);
      const buf = categoryWorkbookToBuffer(wb);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="kategorien-vorlage.xlsx"',
        },
      });
    }

    const { data, error } = await auth.supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const categories = (data ?? []) as FoodCategory[];
    const active = categories.filter((c) => !c.deleted_at);
    if (format === "csv") {
      const csv = categoriesToCsv(active);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="kategorien-export.csv"',
        },
      });
    }

    const wb = buildCategoryWorkbook(categoriesToExcelRows(active));
    const buf = categoryWorkbookToBuffer(wb);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="kategorien-export.xlsx"',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST: import/update from uploaded .xlsx or .csv */
export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let fileName = "upload.xlsx";
  let bytes: ArrayBuffer | string;

  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Datei fehlt (Feld „file“)" },
          { status: 400 }
        );
      }
      fileName = file.name || fileName;
      bytes = await file.arrayBuffer();
    } else {
      const body = (await request.json()) as {
        filename?: string;
        csv?: string;
        base64?: string;
      };
      fileName = body.filename || (body.csv ? "upload.csv" : fileName);
      if (body.csv) {
        bytes = body.csv;
      } else if (body.base64) {
        const bin = Buffer.from(body.base64, "base64");
        bytes = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
      } else {
        return NextResponse.json(
          { error: "Keine Datei / kein CSV im Body" },
          { status: 400 }
        );
      }
    }
  } catch {
    return NextResponse.json({ error: "Ungültiger Upload" }, { status: 400 });
  }

  let rows;
  try {
    rows = parseCategoryExcelFile(bytes, fileName);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Datei konnte nicht gelesen werden: ${e.message}`
            : "Datei konnte nicht gelesen werden",
      },
      { status: 400 }
    );
  }

  if (!rows.length) {
    return NextResponse.json(
      { error: "Keine Datenzeilen in der Datei gefunden" },
      { status: 400 }
    );
  }

  const existingRes = await auth.supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (existingRes.error) {
    return NextResponse.json(
      { error: existingRes.error.message },
      { status: 500 }
    );
  }
  const existing = (existingRes.data ?? []) as FoodCategory[];

  const plan = planCategoryImport(rows, existing);

  let updated = 0;
  let created = 0;
  const applyErrors: string[] = [];

  // Creates first for parents that appear before children in plan
  // plan already orders roots before children within creates/updates lists,
  // but mixed updates of parents + creates of children need creates of parents first.
  // Merge into single ordered list: creates then updates? Better: topological from plan.
  const ordered = [...plan.creates, ...plan.updates].sort((a, b) => {
    const ap = a.payload.parent_id ? 1 : 0;
    const bp = b.payload.parent_id ? 1 : 0;
    return ap - bp || a.row - b.row;
  });

  for (const item of ordered) {
    if (item.action === "create") {
      let { error } = await auth.supabase
        .from("categories")
        .insert(item.payload)
        .select("id")
        .single();

      if (error && /show_on_homepage|column/i.test(error.message)) {
        const { show_on_homepage: _drop, ...without } = item.payload;
        const retry = await auth.supabase
          .from("categories")
          .insert(without)
          .select("id")
          .single();
        error = retry.error;
      }

      if (error) {
        applyErrors.push(`Zeile ${item.row} (${item.id}): ${error.message}`);
      } else {
        created += 1;
      }
    } else {
      const { id, ...fields } = item.payload;
      let { error } = await auth.supabase
        .from("categories")
        .update({
          name_ar: fields.name_ar,
          name_de: fields.name_de,
          image: fields.image,
          sort_order: fields.sort_order,
          parent_id: fields.parent_id,
          show_on_homepage: fields.show_on_homepage,
          deleted_at: null,
        })
        .eq("id", id);

      if (error && /show_on_homepage|column/i.test(error.message)) {
        const retry = await auth.supabase
          .from("categories")
          .update({
            name_ar: fields.name_ar,
            name_de: fields.name_de,
            image: fields.image,
            sort_order: fields.sort_order,
            parent_id: fields.parent_id,
            deleted_at: null,
          })
          .eq("id", id);
        error = retry.error;
      }

      if (error) {
        applyErrors.push(`Zeile ${item.row} (${id}): ${error.message}`);
      } else {
        updated += 1;
      }
    }
  }

  if (created + updated > 0) bust();

  const message = [
    updated > 0 ? `${updated} Kategorien erfolgreich aktualisiert` : null,
    created > 0 ? `${created} neu erstellt` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return NextResponse.json({
    success: applyErrors.length === 0 && plan.issues.length === 0,
    updated,
    created,
    skipped: plan.issues.length,
    issues: plan.issues,
    applyErrors,
    message:
      message ||
      (plan.issues.length
        ? "Import mit Fehlern — keine gültigen Zeilen"
        : "Keine Änderungen"),
  });
}
