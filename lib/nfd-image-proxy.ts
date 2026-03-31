/** Nationwide FD catalog name in `products.manufacturer` / `manufacturers.name`. */
export const NFD_MANUFACTURER_NAME = "Nationwide FD";

/** Re-encode literal spaces so /api/image-proxy receives a single `url` value fetch() can use after Next.js decodes the query string. */
function imageProxySrcFromHref(href: string): string {
  const safe = href.split(" ").join("%20");
  return `/api/image-proxy?url=${encodeURIComponent(safe)}`;
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isNationwideFdHost(host: string): boolean {
  return host === "nationwidefd.com" || host.endsWith(".nationwidefd.com");
}

function isNationwideFdImageUrl(url: string): boolean {
  const host = getHostname(url);
  if (!host) return false;
  return isNationwideFdHost(host);
}

/** Homepage manufacturer cards: proxy NFD backgrounds through same-origin image API. */
export function proxyIfNfdManufacturer(manufacturer: string, url: string | null): string | null {
  if (!url) return null;
  if (manufacturer === NFD_MANUFACTURER_NAME && isNationwideFdImageUrl(url)) {
    return imageProxySrcFromHref(url);
  }
  return url;
}

function needsNationwideFdProxy(url: string, manufacturer?: string | null): boolean {
  if (!isNationwideFdImageUrl(url)) return false;
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
  if (manufacturerName === NFD_MANUFACTURER_NAME && isNationwideFdImageUrl(trimmed)) {
    return imageProxySrcFromHref(trimmed);
  }
  return trimmed;
}
