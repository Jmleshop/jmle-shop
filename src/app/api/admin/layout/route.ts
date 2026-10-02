import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff, staffDataClient } from "@/lib/admin-server";
import {
  LAYOUT_SETTING_KEYS,
  MAX_LAYOUT_VERSIONS,
  defaultLayoutDocument,
  documentsEqual,
  normalizeLayoutDocument,
  normalizeLayoutVersions,
  type LayoutDocument,
  type LayoutVersionEntry,
} from "@/lib/layout-builder";
import {
  friendlySiteSettingsError,
  upsertSiteSetting,
} from "@/lib/site-settings";

export const dynamic = "force-dynamic";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("site");
    revalidateTag("layout");
  } catch {
    /* ignore */
  }
}

async function readKey(
  supabase: ReturnType<typeof staffDataClient>,
  key: string
): Promise<unknown> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) return null;
  return data?.value ?? null;
}

async function loadBundle(supabase: ReturnType<typeof staffDataClient>) {
  const [draftRaw, publishedRaw, versionsRaw] = await Promise.all([
    readKey(supabase, LAYOUT_SETTING_KEYS.draft),
    readKey(supabase, LAYOUT_SETTING_KEYS.published),
    readKey(supabase, LAYOUT_SETTING_KEYS.versions),
  ]);

  const published = publishedRaw
    ? normalizeLayoutDocument(publishedRaw)
    : defaultLayoutDocument();
  const draft = draftRaw
    ? normalizeLayoutDocument(draftRaw)
    : normalizeLayoutDocument(published);
  const versions = normalizeLayoutVersions(versionsRaw);
  const dirty = !documentsEqual(draft, published);

  return { draft, published, versions, dirty };
}

export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const db = staffDataClient(auth.supabase);
  const bundle = await loadBundle(db);
  return NextResponse.json(bundle);
}

type ActionBody = {
  action?: "save_draft" | "publish" | "discard" | "rollback";
  document?: unknown;
  versionId?: string;
  label?: string;
};

export async function PUT(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const db = staffDataClient(auth.supabase);

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const action = body.action || "save_draft";
  const now = new Date().toISOString();

  if (action === "save_draft") {
    const document = normalizeLayoutDocument(body.document);
    document.updatedAt = now;
    const saved = await upsertSiteSetting(db, LAYOUT_SETTING_KEYS.draft, document);
    if (saved.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(saved.error) },
        { status: 500 }
      );
    }
    const bundle = await loadBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  if (action === "discard") {
    const publishedRaw = await readKey(db, LAYOUT_SETTING_KEYS.published);
    const published = publishedRaw
      ? normalizeLayoutDocument(publishedRaw)
      : defaultLayoutDocument();
    published.updatedAt = now;
    const saved = await upsertSiteSetting(db, LAYOUT_SETTING_KEYS.draft, published);
    if (saved.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(saved.error) },
        { status: 500 }
      );
    }
    const bundle = await loadBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  if (action === "publish") {
    const current = await loadBundle(db);
    const document = body.document
      ? normalizeLayoutDocument(body.document)
      : current.draft;
    document.updatedAt = now;

    const version: LayoutVersionEntry = {
      id: crypto.randomUUID(),
      label: (typeof body.label === "string" && body.label.trim()) ||
        `Release ${new Date().toLocaleString("de-DE")}`,
      publishedAt: now,
      document: { ...current.published },
    };
    const versions = [version, ...current.versions].slice(0, MAX_LAYOUT_VERSIONS);

    const draftSave = await upsertSiteSetting(db, LAYOUT_SETTING_KEYS.draft, document);
    if (draftSave.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(draftSave.error) },
        { status: 500 }
      );
    }
    const pubSave = await upsertSiteSetting(
      db,
      LAYOUT_SETTING_KEYS.published,
      document
    );
    if (pubSave.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(pubSave.error) },
        { status: 500 }
      );
    }
    const verSave = await upsertSiteSetting(db, LAYOUT_SETTING_KEYS.versions, versions);
    if (verSave.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(verSave.error) },
        { status: 500 }
      );
    }

    bust();
    const bundle = await loadBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  if (action === "rollback") {
    const versionId = typeof body.versionId === "string" ? body.versionId : "";
    if (!versionId) {
      return NextResponse.json({ error: "versionId fehlt" }, { status: 400 });
    }
    const current = await loadBundle(db);
    const entry = current.versions.find((v) => v.id === versionId);
    if (!entry) {
      return NextResponse.json({ error: "Version nicht gefunden" }, { status: 404 });
    }
    const document: LayoutDocument = {
      ...normalizeLayoutDocument(entry.document),
      updatedAt: now,
    };

    // Aktuellen Published-Stand als neue Version sichern
    const snapshot: LayoutVersionEntry = {
      id: crypto.randomUUID(),
      label: `Vor Rollback ${new Date().toLocaleString("de-DE")}`,
      publishedAt: now,
      document: { ...current.published },
    };
    const versions = [snapshot, ...current.versions].slice(0, MAX_LAYOUT_VERSIONS);

    for (const [key, value] of [
      [LAYOUT_SETTING_KEYS.draft, document],
      [LAYOUT_SETTING_KEYS.published, document],
      [LAYOUT_SETTING_KEYS.versions, versions],
    ] as const) {
      const saved = await upsertSiteSetting(db, key, value);
      if (saved.error) {
        return NextResponse.json(
          { error: friendlySiteSettingsError(saved.error) },
          { status: 500 }
        );
      }
    }

    bust();
    const bundle = await loadBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
