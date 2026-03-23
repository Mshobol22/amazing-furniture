"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const ARRAY_KEYS = ["manufacturer", "category", "color", "material", "collection"] as const;

const KEY_LABELS: Record<string, string> = {
  manufacturer: "Brand",
  category: "Category",
  color: "Color",
  material: "Material",
  collection: "Collection",
};

const CATEGORY_DISPLAY: Record<string, string> = {
  sofa: "Sofas & Sectionals",
  bed: "Beds & Bedroom",
  chair: "Chairs & Recliners",
  table: "Dining & Tables",
  cabinet: "Dressers & Cabinets",
  "tv-stand": "TV Stands & Entertainment",
  rug: "Rugs & Floor Coverings",
};

interface Chip {
  key: string;
  value: string;
  label: string;
}

export default function ActiveFilterChips() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const chips: Chip[] = [];

  // Array params — each value becomes its own chip
  for (const key of ARRAY_KEYS) {
    const values = searchParams.get(key)?.split(",").filter(Boolean) ?? [];
    for (const value of values) {
      const displayValue =
        key === "category" ? (CATEGORY_DISPLAY[value] ?? value) : value;
      chips.push({ key, value, label: `${KEY_LABELS[key]}: ${displayValue}` });
    }
  }

  // Boolean params
  if (searchParams.get("in_stock") === "true")
    chips.push({ key: "in_stock", value: "true", label: "In Stock Only" });
  if (searchParams.get("on_sale") === "true")
    chips.push({ key: "on_sale", value: "true", label: "On Sale" });

  // Price params
  const priceMin = searchParams.get("price_min");
  const priceMax = searchParams.get("price_max");
  if (priceMin)
    chips.push({ key: "price_min", value: priceMin, label: `Min $${Number(priceMin).toLocaleString()}` });
  if (priceMax)
    chips.push({ key: "price_max", value: priceMax, label: `Max $${Number(priceMax).toLocaleString()}` });

  if (chips.length === 0) return null;

  const remove = (chip: Chip) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page");

    if ((ARRAY_KEYS as readonly string[]).includes(chip.key)) {
      const current = p.get(chip.key)?.split(",").filter(Boolean) ?? [];
      const next = current.filter((v) => v !== chip.value);
      if (next.length > 0) p.set(chip.key, next.join(","));
      else p.delete(chip.key);
    } else {
      p.delete(chip.key);
    }

    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={`${chip.key}:${chip.value}`}
          type="button"
          onClick={() => remove(chip)}
          className="flex items-center gap-1.5 rounded-full border border-[#2D4A3E]/25 bg-[#FAF8F5] px-3 py-1 text-xs font-medium text-[#2D4A3E] transition-colors hover:bg-[#2D4A3E]/8"
        >
          {chip.label}
          <span className="text-[#2D4A3E]/50">×</span>
        </button>
      ))}
    </div>
  );
}
