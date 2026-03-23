"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  ColorSwatchGrid,
  COLOR_HEX,
} from "@/components/ui/filter-helpers";
import {
  parseFiltersFromSearchParams,
  computeFacetCounts,
  type FilterMetaRow,
} from "@/lib/filters";

// ── Constants ──────────────────────────────────────────────────────────────

const PRICE_PRESETS = [
  { label: "Under $500", min: "", max: "500" },
  { label: "$500–$1,500", min: "500", max: "1500" },
  { label: "$1,500–$3,000", min: "1500", max: "3000" },
  { label: "$3,000+", min: "3000", max: "" },
];

const CATEGORY_LABELS: Record<string, string> = {
  sofa: "Sofas & Sectionals",
  bed: "Beds & Bedroom",
  chair: "Chairs & Recliners",
  table: "Dining & Tables",
  cabinet: "Dressers & Cabinets",
  "tv-stand": "TV Stands & Entertainment",
  rug: "Rugs & Floor Coverings",
};

// ── FilterSection ──────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-xs font-semibold uppercase tracking-widest text-[#1C1C1C]"
      >
        {title}
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-[#1C1C1C]/40" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[#1C1C1C]/40" />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// ── CheckboxRow ────────────────────────────────────────────────────────────

function CheckboxRow({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
        />
        {label}
      </span>
      {count != null && (
        <span className="text-xs text-[#1C1C1C]/35">{count.toLocaleString()}</span>
      )}
    </label>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ProductSidebarProps {
  filterMeta: FilterMetaRow[];
  hideBrand?: boolean;
  hideCategory?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProductSidebar({
  filterMeta,
  hideBrand = false,
  hideCategory = false,
}: ProductSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive current filter state from URL
  const activeFilters = parseFiltersFromSearchParams(searchParams);
  const selectedManufacturers = activeFilters.manufacturer ?? [];
  const selectedCategories = activeFilters.category ?? [];
  const selectedColors = activeFilters.color ?? [];
  const selectedMaterials = activeFilters.material ?? [];
  const selectedCollections = activeFilters.collection ?? [];
  const inStock = activeFilters.in_stock ?? false;
  const onSale = activeFilters.on_sale ?? false;

  // Price inputs keep local pending state; committed on Apply or preset click
  const [pendingMin, setPendingMin] = useState(
    activeFilters.price_min != null ? String(activeFilters.price_min) : ""
  );
  const [pendingMax, setPendingMax] = useState(
    activeFilters.price_max != null ? String(activeFilters.price_max) : ""
  );

  // ── URL helpers ────────────────────────────────────────────────────────

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname]
  );

  const makeParams = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page");
    return p;
  }, [searchParams]);

  const toggleArray = (key: string, value: string) => {
    const p = makeParams();
    const current = p.get(key)?.split(",").filter(Boolean) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (next.length > 0) p.set(key, next.join(","));
    else p.delete(key);
    push(p);
  };

  const setBool = (key: string, value: boolean) => {
    const p = makeParams();
    if (value) p.set(key, "true");
    else p.delete(key);
    push(p);
  };

  const applyPrice = (min = pendingMin, max = pendingMax) => {
    const p = makeParams();
    if (min) p.set("price_min", min);
    else p.delete("price_min");
    if (max) p.set("price_max", max);
    else p.delete("price_max");
    push(p);
  };

  const setColorArray = (colors: string[]) => {
    const p = makeParams();
    if (colors.length > 0) p.set("color", colors.join(","));
    else p.delete("color");
    push(p);
  };

  const clearAll = () => {
    const p = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) p.set("sort", sort);
    setPendingMin("");
    setPendingMax("");
    push(p);
  };

  // ── Derive option lists from filterMeta ────────────────────────────────

  const unique = (key: keyof FilterMetaRow): string[] => {
    const seen = new Set<string>();
    for (const row of filterMeta) {
      const v = row[key];
      if (typeof v === "string" && v) seen.add(v);
    }
    return Array.from(seen).sort();
  };

  const manufacturerOptions = unique("manufacturer");
  const categoryOptions = unique("category");
  const colorOptions = unique("color");
  const materialOptions = unique("material");
  const collectionOptions = unique("collection");

  // Faceted counts (each dimension counts against all OTHER active filters)
  const manufacturerCounts = computeFacetCounts(filterMeta, activeFilters, "manufacturer");
  const categoryCounts = computeFacetCounts(filterMeta, activeFilters, "category");

  // Active filter count (for Clear All label)
  const activeCount =
    selectedManufacturers.length +
    selectedCategories.length +
    selectedColors.length +
    selectedMaterials.length +
    selectedCollections.length +
    (inStock ? 1 : 0) +
    (onSale ? 1 : 0) +
    (activeFilters.price_min != null ? 1 : 0) +
    (activeFilters.price_max != null ? 1 : 0);

  // Active price preset (for highlighting snap buttons)
  const activePreset = PRICE_PRESETS.find(
    (pr) =>
      (pr.min === "" ? activeFilters.price_min == null : String(activeFilters.price_min) === pr.min) &&
      (pr.max === "" ? activeFilters.price_max == null : String(activeFilters.price_max) === pr.max)
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* Clear All */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="mb-4 text-xs font-medium text-[#2D4A3E] hover:underline"
        >
          Clear All
        </button>
      )}

      {/* 1. AVAILABILITY ─────────────────────────────────────────────── */}
      <FilterSection title="Availability">
        <div className="space-y-2">
          <CheckboxRow
            label="In Stock Only"
            checked={inStock}
            onChange={() => setBool("in_stock", !inStock)}
          />
          <CheckboxRow
            label="On Sale Only"
            checked={onSale}
            onChange={() => setBool("on_sale", !onSale)}
          />
        </div>
      </FilterSection>

      {/* 2. PRICE RANGE ──────────────────────────────────────────────── */}
      <FilterSection title="Price Range">
        {/* Snap presets */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const isActive = activePreset?.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPendingMin(preset.min);
                  setPendingMax(preset.max);
                  applyPrice(preset.min, preset.max);
                }}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  isActive
                    ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                    : "border-[#1C1C1C]/20 text-[#1C1C1C]/60 hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Manual inputs */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="$0"
            value={pendingMin}
            onChange={(e) => setPendingMin(e.target.value)}
            min={0}
            className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          />
          <span className="shrink-0 text-[#1C1C1C]/30">—</span>
          <input
            type="number"
            placeholder="$10,000"
            value={pendingMax}
            onChange={(e) => setPendingMax(e.target.value)}
            min={0}
            className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          />
        </div>
        <button
          type="button"
          onClick={() => applyPrice()}
          className="mt-2 w-full rounded bg-[#2D4A3E] py-1.5 text-xs font-medium text-[#FAF8F5] transition-colors hover:bg-[#3B5E4F]"
        >
          Apply
        </button>
      </FilterSection>

      {/* 3. MANUFACTURER / BRAND ─────────────────────────────────────── */}
      {!hideBrand && manufacturerOptions.length > 0 && (
        <FilterSection title="Manufacturer / Brand">
          <div className="max-h-[220px] space-y-1 overflow-y-auto">
            {manufacturerOptions.map((name) => (
              <CheckboxRow
                key={name}
                label={name}
                checked={selectedManufacturers.includes(name)}
                onChange={() => toggleArray("manufacturer", name)}
                count={manufacturerCounts[name] ?? 0}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* 4. CATEGORY ─────────────────────────────────────────────────── */}
      {!hideCategory && categoryOptions.length > 0 && (
        <FilterSection title="Category">
          <div className="max-h-[220px] space-y-1 overflow-y-auto">
            {categoryOptions.map((cat) => (
              <CheckboxRow
                key={cat}
                label={CATEGORY_LABELS[cat] ?? cat}
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleArray("category", cat)}
                count={categoryCounts[cat] ?? 0}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* 5. COLOR ────────────────────────────────────────────────────── */}
      {colorOptions.length > 0 && (
        <FilterSection title="Color" defaultOpen={false}>
          {/* Swatch grid for colors with known hex; checkboxes for the rest */}
          {colorOptions.some((c) => COLOR_HEX[c]) ? (
            <ColorSwatchGrid
              colors={colorOptions}
              selected={selectedColors}
              onChange={setColorArray}
            />
          ) : (
            <div className="max-h-[220px] space-y-1 overflow-y-auto">
              {colorOptions.map((col) => (
                <CheckboxRow
                  key={col}
                  label={col}
                  checked={selectedColors.includes(col)}
                  onChange={() => toggleArray("color", col)}
                />
              ))}
            </div>
          )}
        </FilterSection>
      )}

      {/* 6. MATERIAL ─────────────────────────────────────────────────── */}
      {materialOptions.length > 0 && (
        <FilterSection title="Material" defaultOpen={false}>
          <div className="max-h-[220px] space-y-1 overflow-y-auto">
            {materialOptions.map((mat) => (
              <CheckboxRow
                key={mat}
                label={mat}
                checked={selectedMaterials.includes(mat)}
                onChange={() => toggleArray("material", mat)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* 7. COLLECTION — only show if > 1 option exists ─────────────── */}
      {collectionOptions.length > 1 && (
        <FilterSection title="Collection" defaultOpen={false}>
          <div className="max-h-[220px] space-y-1 overflow-y-auto">
            {collectionOptions.map((col) => (
              <CheckboxRow
                key={col}
                label={col}
                checked={selectedCollections.includes(col)}
                onChange={() => toggleArray("collection", col)}
              />
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}
