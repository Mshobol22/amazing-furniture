"use client";

import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  sofa: "Sofas",
  bed: "Beds",
  chair: "Chairs",
  table: "Tables",
  cabinet: "Cabinets",
  "tv-stand": "TV Stands",
  rug: "Rugs",
};

const COLOR_HEX: Record<string, string> = {
  Grey: "#808080",
  Beige: "#D4C5A9",
  Black: "#1C1C1C",
  Red: "#B22222",
  Navy: "#1B2951",
  Blue: "#2E5090",
  Brown: "#5C3A1E",
  Green: "#2D4A3E",
  Ivory: "#FFFFF0",
  Gold: "#C5A04E",
  Cream: "#FAF8F5",
  Orange: "#CC5500",
  Rust: "#B7410E",
  Teal: "#008080",
  White: "#F5F5F5",
  Yellow: "#D4A017",
  Purple: "#6A0DAD",
  Pink: "#D4657E",
  Silver: "#C0C0C0",
  Charcoal: "#36454F",
  Terracotta: "#C26B4E",
  Multicolor: "conic-gradient(red, orange, yellow, green, blue, purple, red)",
};

export interface BrandFilters {
  categories: string[];
  collections: string[];
  colors: string[];
  sizes: string[];
  inStockOnly: boolean;
  priceMin: string;
  priceMax: string;
  sort: string;
}

interface BrandFilterSidebarProps {
  availableCategories: string[];
  availableCollections: string[];
  availableColors: string[];
  availableSizes: string[];
  filters: BrandFilters;
  onFiltersChange: (filters: BrandFilters) => void;
  isZinatex: boolean;
}

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
    <div className="border-b border-[#1C1C1C]/10 pb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-[#1C1C1C]"
      >
        {title}
        <span className="text-[#1C1C1C]/40">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
  labelMap,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  labelMap?: Record<string, string>;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-2 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => toggle(option)}
            className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
          />
          {labelMap?.[option] ?? option}
        </label>
      ))}
    </div>
  );
}

function ColorSwatchGrid({
  colors,
  selected,
  onChange,
}: {
  colors: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (color: string) => {
    if (selected.includes(color)) {
      onChange(selected.filter((c) => c !== color));
    } else {
      onChange([...selected, color]);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((color) => {
        const hex = COLOR_HEX[color];
        const isSelected = selected.includes(color);
        const isMulticolor = color === "Multicolor";
        return (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => toggle(color)}
            className={`h-7 w-7 rounded-full border-2 transition-all ${
              isSelected
                ? "border-[#2D4A3E] ring-2 ring-[#2D4A3E]/30"
                : "border-[#1C1C1C]/15 hover:border-[#2D4A3E]/50"
            }`}
            style={{
              background: isMulticolor
                ? "conic-gradient(red, orange, yellow, green, blue, purple, red)"
                : hex ?? "#ccc",
            }}
          />
        );
      })}
    </div>
  );
}

export default function BrandFilterSidebar({
  availableCategories,
  availableCollections,
  availableColors,
  availableSizes,
  filters,
  onFiltersChange,
  isZinatex,
}: BrandFilterSidebarProps) {
  const update = (partial: Partial<BrandFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const activeCount =
    filters.categories.length +
    filters.collections.length +
    filters.colors.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  return (
    <div className="space-y-1">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              categories: [],
              collections: [],
              colors: [],
              sizes: [],
              inStockOnly: false,
              priceMin: "",
              priceMax: "",
              sort: filters.sort,
            })
          }
          className="mb-3 text-xs font-medium text-[#2D4A3E] hover:underline"
        >
          Clear all filters ({activeCount})
        </button>
      )}

      {/* Categories */}
      {availableCategories.length > 1 && (
        <FilterSection title="Category">
          <CheckboxGroup
            options={availableCategories}
            selected={filters.categories}
            onChange={(categories) => update({ categories })}
            labelMap={CATEGORY_LABELS}
          />
        </FilterSection>
      )}

      {/* Collections — furniture brands */}
      {!isZinatex && availableCollections.length > 0 && (
        <FilterSection title="Collection">
          <CheckboxGroup
            options={availableCollections}
            selected={filters.collections}
            onChange={(collections) => update({ collections })}
          />
        </FilterSection>
      )}

      {/* Colors — Zinatex */}
      {isZinatex && availableColors.length > 0 && (
        <FilterSection title="Color">
          <ColorSwatchGrid
            colors={availableColors}
            selected={filters.colors}
            onChange={(colors) => update({ colors })}
          />
        </FilterSection>
      )}

      {/* Sizes — Zinatex */}
      {isZinatex && availableSizes.length > 0 && (
        <FilterSection title="Size">
          <CheckboxGroup
            options={availableSizes}
            selected={filters.sizes}
            onChange={(sizes) => update({ sizes })}
          />
        </FilterSection>
      )}

      {/* In Stock */}
      <FilterSection title="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1C1C1C]/80">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => update({ inStockOnly: e.target.checked })}
            className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
          />
          In stock only
        </label>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => update({ priceMin: e.target.value })}
            min={0}
            className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          />
          <span className="text-[#1C1C1C]/40">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => update({ priceMax: e.target.value })}
            min={0}
            className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          />
        </div>
      </FilterSection>
    </div>
  );
}
