const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  bed: "Beds & Bedroom",
  sofa: "Sofas & Sectionals",
  table: "Dining & Tables",
  chair: "Chairs & Recliners",
  cabinet: "Dressers & Cabinets",
  "tv-stand": "TV Stands & Entertainment",
};

export function getCategoryDisplayName(slug: string): string {
  return CATEGORY_DISPLAY_NAMES[slug] ?? slug;
}
