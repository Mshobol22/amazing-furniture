const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  bed: "Beds & Bedroom",
  sofa: "Sofas & Sectionals",
  table: "Dining & Tables",
  chair: "Chairs & Recliners",
  cabinet: "Cabinets & Storage",
  "tv-stand": "TV Stands & Media",
};

export function getCategoryDisplayName(slug: string): string {
  return CATEGORY_DISPLAY_NAMES[slug] ?? slug;
}
