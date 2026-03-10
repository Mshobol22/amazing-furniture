import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// TODO: Add placeholder at public/placeholder-furniture.jpg (cream background, furniture silhouette)
export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80";

export function proxyImage(url: string | null | undefined): string {
  if (!url || url.trim() === "") return FALLBACK_IMAGE;
  if (url.includes("nationwidefd.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
