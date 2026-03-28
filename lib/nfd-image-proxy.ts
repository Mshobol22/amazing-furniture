/** Nationwide FD catalog name in `products.manufacturer` / `manufacturers.name`. */
export const NFD_MANUFACTURER_NAME = "Nationwide FD";

/** Re-encode literal spaces so /api/image-proxy receives a single `url` value fetch() can use after Next.js decodes the query string. */
function imageProxySrcFromHref(href: string): string {
  const safe = href.split(" ").join("%20");
  return `/api/image-proxy?url=${encodeURIComponent(safe)}`;
}

/** Homepage manufacturer cards: proxy NFD backgrounds through same-origin image API. */
export function proxyIfNfdManufacturer(manufacturer: string, url: string | null): string | null {
  if (!url) return null;
  if (manufacturer === NFD_MANUFACTURER_NAME) {
    return imageProxySrcFromHref(url);
  }
  return url;
}

function needsNationwideFdProxy(url: string, manufacturer?: string | null): boolean {
  return manufacturer === NFD_MANUFACTURER_NAME || url.includes("nationwidefd.com");
}

/** Lead product image `src` for `next/image` (https or `/api/image-proxy?...`). */
export function productLeadImageSrc(
  manufacturer: string | null | undefined,
  rawImage: string | null | undefined
): string | null {
  if (!rawImage || typeof rawImage !== "string") return null;
  if (!rawImage.startsWith("https://")) return null;
  if (needsNationwideFdProxy(rawImage, manufacturer)) {
    return imageProxySrcFromHref(rawImage);
  }
  return rawImage;
}

/**
 * Brand logo `src` for `next/image`.
 * Allows `https://…` (Nationwide FD proxied) and same-site root-relative paths such as `/logos/acme.png`.
 */
export function brandLogoSrc(
  manufacturerName: string,
  logoUrl: string | null | undefined
): string | null {
  if (logoUrl == null || typeof logoUrl !== "string") return null;
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  if (!trimmed.startsWith("https://")) return null;
  if (trimmed.includes("nationwidefd.com") || manufacturerName === NFD_MANUFACTURER_NAME) {
    return imageProxySrcFromHref(trimmed);
  }
  return trimmed;
}
