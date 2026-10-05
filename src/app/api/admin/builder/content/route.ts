import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff, staffDataClient } from "@/lib/admin-server";
import {
  LAYOUT_SETTING_KEYS,
  MAX_LAYOUT_VERSIONS,
  defaultBuilderContentDraft,
  defaultLayoutDocument,
  documentsEqual,
  normalizeBuilderContentDraft,
  normalizeLayoutDocument,
  normalizeLayoutVersions,
  type BuilderContentDraft,
  type LayoutDocument,
  type LayoutVersionEntry,
} from "@/lib/layout-builder";
import { normalizeHomepageSections } from "@/lib/homepage-sections";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-defaults";
import {
  friendlySiteSettingsError,
  upsertSiteSetting,
} from "@/lib/site-settings";
import type { HomepageSection } from "@/types";

export const dynamic = "force-dynamic";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("site");
    revalidateTag("layout");
    revalidateTag("slides");
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

async function loadPublishedContent(
  supabase: ReturnType<typeof staffDataClient>
): Promise<{
  sections: HomepageSection[];
  slideOrders: Record<string, string[]>;
  slides: Array<{ id: string; slider_zone?: string; sort_order?: number; title?: string; image?: string }>;
}> {
  const siteRaw = await readKey(supabase, "site");
  const site =
    siteRaw && typeof siteRaw === "object"
      ? (siteRaw as Record<string, unknown>)
      : {};
  const sections = normalizeHomepageSections(site.homepageSections, {
    brands: String(site.brandsSectionTitle ?? ""),
    banner2: String(site.banner2SectionTitle ?? ""),
    banner3: String(site.banner3SectionTitle ?? ""),
    categories: String(site.categoriesSectionTitle ?? ""),
  });

  const { data: slides } = await supabase
    .from("hero_slides")
    .select("id, slider_zone, sort_order, title, image")
    .order("sort_order", { ascending: true });

  const slideRows = slides ?? [];
  const slideOrders: Record<string, string[]> = {};
  for (const row of slideRows) {
    const zone = String(row.slider_zone || "banner1");
    if (!slideOrders[zone]) slideOrders[zone] = [];
    slideOrders[zone].push(String(row.id));
  }

  return { sections, slideOrders, slides: slideRows };
}

async function loadContentBundle(
  supabase: ReturnType<typeof staffDataClient>
) {
  const [draftRaw, layoutDraftRaw, layoutPubRaw] = await Promise.all([
    readKey(supabase, LAYOUT_SETTING_KEYS.contentDraft),
    readKey(supabase, LAYOUT_SETTING_KEYS.draft),
    readKey(supabase, LAYOUT_SETTING_KEYS.published),
  ]);

  const published = await loadPublishedContent(supabase);
  const draftParsed = draftRaw
    ? normalizeBuilderContentDraft(draftRaw)
    : null;

  const draftSections =
    draftParsed && draftParsed.homepageSections.length
      ? normalizeHomepageSections(draftParsed.homepageSections)
      : published.sections;

  const draftOrders =
    draftParsed && Object.keys(draftParsed.slideOrders).length
      ? draftParsed.slideOrders
      : published.slideOrders;

  const contentDraft: BuilderContentDraft = {
    homepageSections: draftSections,
    slideOrders: draftOrders,
    updatedAt: draftParsed?.updatedAt || new Date().toISOString(),
  };

  const layoutDraft = layoutDraftRaw
    ? normalizeLayoutDocument(layoutDraftRaw)
    : layoutPubRaw
      ? normalizeLayoutDocument(layoutPubRaw)
      : defaultLayoutDocument();
  const layoutPublished = layoutPubRaw
    ? normalizeLayoutDocument(layoutPubRaw)
    : defaultLayoutDocument();

  const structureDirty =
    JSON.stringify(draftSections.map((s) => ({ id: s.id, sortOrder: s.sortOrder, active: s.active }))) !==
      JSON.stringify(
        published.sections.map((s) => ({
          id: s.id,
          sortOrder: s.sortOrder,
          active: s.active,
        }))
      ) ||
    JSON.stringify(draftOrders) !== JSON.stringify(published.slideOrders);

  return {
    contentDraft,
    publishedContent: {
      homepageSections: published.sections,
      slideOrders: published.slideOrders,
    },
    slides: published.slides,
    layoutDraft,
    layoutPublished,
    layoutDirty: !documentsEqual(layoutDraft, layoutPublished),
    structureDirty,
    dirty: structureDirty || !documentsEqual(layoutDraft, layoutPublished),
  };
}

export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const db = staffDataClient(auth.supabase);
  const bundle = await loadContentBundle(db);
  return NextResponse.json(bundle);
}

type ActionBody = {
  action?: "save_draft" | "publish" | "discard";
  content?: unknown;
  document?: unknown;
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
    const content = normalizeBuilderContentDraft(body.content);
    content.updatedAt = now;
    if (Array.isArray(content.homepageSections)) {
      content.homepageSections = normalizeHomepageSections(
        content.homepageSections
      );
    }
    const saved = await upsertSiteSetting(
      db,
      LAYOUT_SETTING_KEYS.contentDraft,
      content
    );
    if (saved.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(saved.error) },
        { status: 500 }
      );
    }

    if (body.document != null) {
      const document = normalizeLayoutDocument(body.document);
      document.updatedAt = now;
      const layoutSave = await upsertSiteSetting(
        db,
        LAYOUT_SETTING_KEYS.draft,
        document
      );
      if (layoutSave.error) {
        return NextResponse.json(
          { error: friendlySiteSettingsError(layoutSave.error) },
          { status: 500 }
        );
      }
    }

    const bundle = await loadContentBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  if (action === "discard") {
    const published = await loadPublishedContent(db);
    const content: BuilderContentDraft = {
      homepageSections: published.sections,
      slideOrders: published.slideOrders,
      updatedAt: now,
    };
    const saved = await upsertSiteSetting(
      db,
      LAYOUT_SETTING_KEYS.contentDraft,
      content
    );
    if (saved.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(saved.error) },
        { status: 500 }
      );
    }
    const pubLayoutRaw = await readKey(db, LAYOUT_SETTING_KEYS.published);
    const pubLayout = pubLayoutRaw
      ? normalizeLayoutDocument(pubLayoutRaw)
      : defaultLayoutDocument();
    pubLayout.updatedAt = now;
    await upsertSiteSetting(db, LAYOUT_SETTING_KEYS.draft, pubLayout);

    const bundle = await loadContentBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  if (action === "publish") {
    const current = await loadContentBundle(db);
    const content = body.content
      ? normalizeBuilderContentDraft(body.content)
      : current.contentDraft;
    content.homepageSections = normalizeHomepageSections(
      content.homepageSections
    );
    content.updatedAt = now;

    const document: LayoutDocument = body.document
      ? normalizeLayoutDocument(body.document)
      : current.layoutDraft;
    document.updatedAt = now;

    // 1) Site homepageSections
    const siteRaw = await readKey(db, "site");
    const prevSite =
      siteRaw && typeof siteRaw === "object"
        ? (siteRaw as Record<string, unknown>)
        : {};
    const nextSite = {
      ...DEFAULT_SITE_CONFIG,
      ...prevSite,
      homepageSections: content.homepageSections,
    };
    const siteSave = await upsertSiteSetting(db, "site", nextSite);
    if (siteSave.error) {
      return NextResponse.json(
        { error: friendlySiteSettingsError(siteSave.error) },
        { status: 500 }
      );
    }

    // 2) Slide orders
    for (const [zone, ids] of Object.entries(content.slideOrders)) {
      for (let i = 0; i < ids.length; i++) {
        const { error } = await db
          .from("hero_slides")
          .update({ sort_order: i, slider_zone: zone })
          .eq("id", ids[i]);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    // 3) Layout draft + published + versions (with content snapshot)
    const versionsRaw = await readKey(db, LAYOUT_SETTING_KEYS.versions);
    const versions = normalizeLayoutVersions(versionsRaw);
    const version: LayoutVersionEntry = {
      id: crypto.randomUUID(),
      label:
        (typeof body.label === "string" && body.label.trim()) ||
        `Release ${new Date().toLocaleString("de-DE")}`,
      publishedAt: now,
      document: { ...current.layoutPublished },
      content: {
        homepageSections: current.publishedContent.homepageSections,
        slideOrders: current.publishedContent.slideOrders,
        updatedAt: now,
      },
    };
    const nextVersions = [version, ...versions].slice(0, MAX_LAYOUT_VERSIONS);

    for (const [key, value] of [
      [LAYOUT_SETTING_KEYS.draft, document],
      [LAYOUT_SETTING_KEYS.published, document],
      [LAYOUT_SETTING_KEYS.versions, nextVersions],
      [LAYOUT_SETTING_KEYS.contentDraft, content],
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
    const bundle = await loadContentBundle(db);
    return NextResponse.json({ ok: true, ...bundle });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
