/** Nationwide FD catalog name in `products.manufacturer` / `manufacturers.name`. */
export const NFD_MANUFACTURER_NAME = "Nationwide FD";

/** Homepage manufacturer cards: proxy NFD backgrounds through same-origin image API. */
export function proxyIfNfdManufacturer(manufacturer: string, url: string | null): string | null {
  if (!url) return null;
  if (manufacturer === NFD_MANUFACTURER_NAME) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
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
    return `/api/image-proxy?url=${encodeURIComponent(rawImage)}`;
  }
  return rawImage;
}

/** Brand logo `src` for `next/image`. */
export function brandLogoSrc(
  manufacturerName: string,
  logoUrl: string | null | undefined
): string | null {
  if (!logoUrl?.startsWith("https://")) return null;
  if (logoUrl.includes("nationwidefd.com") || manufacturerName === NFD_MANUFACTURER_NAME) {
    return `/api/image-proxy?url=${encodeURIComponent(logoUrl)}`;
  }
  return logoUrl;
}
