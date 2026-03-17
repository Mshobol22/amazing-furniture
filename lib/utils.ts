import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_IMAGE = "/placeholder-furniture.svg";

/**
 * Extract SKU/model number from product slug (e.g. "black-king-bed-b535" -> "B535")
 * Matches patterns like U393, B101, T350 (letter + 2-4 digits)
 */
export function extractSku(slug: string): string | null {
  const segments = slug.split("-").filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && /^[A-Za-z]\d{2,4}$/i.test(seg)) return seg.toUpperCase();
  }
  return null;
}

export function proxyImage(url: string | null | undefined): string {
  if (!url || url.trim() === "") return FALLBACK_IMAGE;
  if (url.includes("nationwidefd.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Slugify: replace ALL whitespace with hyphens for URL-safe slugs.
 * Use when creating/updating product slugs to prevent broken links.
 */
export function slugify(text: string): string {
  return text.trim().replace(/\s+/g, "-").toLowerCase();
}
