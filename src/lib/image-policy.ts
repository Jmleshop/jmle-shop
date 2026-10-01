/**
 * Zentrale Bild-Policy — Single Source of Truth für Upload + Anzeige.
 * Rollen: product | category | banner | logo
 */

import { SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

export type ImageRole = "product" | "category" | "banner" | "logo";

export type ImageObjectFit = "contain" | "cover";

export type ImageAspect = "1:1" | "preserve";

export type ImageEditorMode = "adjust-square" | "preserve-aspect" | "none";

export type ImagePolicy = {
  role: ImageRole;
  objectFit: ImageObjectFit;
  /** CSS background for the frame; null = transparent */
  frameBackground: string | null;
  aspect: ImageAspect;
  maxEdge: number;
  /** 0–1 WebP quality for storage encode */
  storageQuality: number;
  /** Next/Image quality 1–100 for shop delivery */
  displayQuality: number;
  /**
   * Visual inset on the display frame (0–0.5).
   * Applied once via CSS for product; bake uses bakeFill instead.
   */
  paddingRatio: number;
  /** Fraction of square filled by subject when baking 1:1 (product/category). */
  bakeFill: number;
  allowEditor: boolean;
  editorMode: ImageEditorMode;
  /** Tailwind / CSS utility hint for frame bg */
  frameBgClass: string;
  frameClass: string;
  mediaClass: string;
};

export const IMAGE_BG_PRODUCT = "#FFFFFF";
export const IMAGE_BG_CATEGORY = "#FFFFFF";
export const IMAGE_BG_BANNER = "#FFF7ED";
export const IMAGE_BG_LOGO: string | null = null;

export const MAX_EDGE_PRODUCT = 800;
export const MAX_EDGE_BANNER = 1280;
export const MAX_EDGE_LOGO = 1600;
export const STORAGE_WEBP_QUALITY = 0.86;
export const STORAGE_WEBP_QUALITY_PCT = 86;
export const LOGO_WEBP_QUALITY = 0.92;
export const STORAGE_MAX_MB = 0.55;

const POLICIES: Record<ImageRole, ImagePolicy> = {
  product: {
    role: "product",
    objectFit: "contain",
    frameBackground: IMAGE_BG_PRODUCT,
    aspect: "1:1",
    maxEdge: MAX_EDGE_PRODUCT,
    storageQuality: STORAGE_WEBP_QUALITY,
    displayQuality: SHOP_IMAGE_QUALITY,
    // Display padding only (CSS); bake nearly full so we don't double-pad
    paddingRatio: 0.06,
    bakeFill: 0.92,
    allowEditor: true,
    editorMode: "adjust-square",
    frameBgClass: "bg-white",
    frameClass: "shop-image-frame shop-image-frame--product",
    mediaClass: "shop-image-media shop-image-media--product",
  },
  category: {
    role: "category",
    objectFit: "cover",
    frameBackground: IMAGE_BG_CATEGORY,
    aspect: "1:1",
    maxEdge: MAX_EDGE_PRODUCT,
    storageQuality: STORAGE_WEBP_QUALITY,
    displayQuality: SHOP_IMAGE_QUALITY,
    paddingRatio: 0,
    bakeFill: 1,
    allowEditor: true,
    editorMode: "adjust-square",
    frameBgClass: "bg-white",
    frameClass: "shop-image-frame shop-image-frame--category",
    mediaClass: "shop-image-media shop-image-media--category",
  },
  banner: {
    role: "banner",
    objectFit: "contain",
    frameBackground: IMAGE_BG_BANNER,
    aspect: "preserve",
    maxEdge: MAX_EDGE_BANNER,
    storageQuality: STORAGE_WEBP_QUALITY,
    displayQuality: SHOP_IMAGE_QUALITY,
    paddingRatio: 0,
    bakeFill: 1,
    allowEditor: false,
    editorMode: "none",
    frameBgClass: "bg-jmle-cream",
    frameClass: "shop-image-frame shop-image-frame--banner",
    mediaClass: "shop-image-media shop-image-media--banner",
  },
  logo: {
    role: "logo",
    objectFit: "contain",
    frameBackground: IMAGE_BG_LOGO,
    aspect: "preserve",
    maxEdge: MAX_EDGE_LOGO,
    storageQuality: LOGO_WEBP_QUALITY,
    displayQuality: SHOP_IMAGE_QUALITY,
    paddingRatio: 0,
    bakeFill: 1,
    allowEditor: false,
    editorMode: "none",
    frameBgClass: "bg-transparent",
    frameClass: "shop-image-frame shop-image-frame--logo",
    mediaClass: "shop-image-media shop-image-media--logo",
  },
};

export function policyForRole(role: ImageRole): ImagePolicy {
  return POLICIES[role];
}

export function isLogoFolder(folder: string): boolean {
  return /^(brand|brands|logo|logos)$/.test(folder.trim().toLowerCase());
}

export function isBannerFolder(folder: string): boolean {
  return /^(banners?|slides|hero)$/.test(folder.trim().toLowerCase());
}

export function isCategoryFolder(folder: string): boolean {
  return /^categor(y|ies)$/.test(folder.trim().toLowerCase());
}

export function roleForFolder(folder: string): ImageRole {
  const key = folder.trim().toLowerCase();
  if (isLogoFolder(key)) return "logo";
  if (isBannerFolder(key)) return "banner";
  if (isCategoryFolder(key)) return "category";
  return "product";
}

export function policyForFolder(folder: string): ImagePolicy {
  return policyForRole(roleForFolder(folder));
}

export function maxEdgeForFolder(folder: string): number {
  return policyForFolder(folder).maxEdge;
}

export function storageQualityForFolder(folder: string): number {
  return policyForFolder(folder).storageQuality;
}
