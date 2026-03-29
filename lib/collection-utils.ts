const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  bedroom: "Beds & Bedroom Furniture",
  sofa: "Sofas & Sectionals",
  chair: "Chairs & Recliners",
  table: "Dining & Tables",
  cabinet: "Cabinets & Storage",
  "tv-stand": "TV Stands & Entertainment",
  rug: "Rugs & Floor Coverings",
  other: "More Furniture",
};

export function getCategoryDisplayName(slug: string): string {
  return CATEGORY_DISPLAY_NAMES[slug] ?? slug;
}
