"use client";

import { useState } from "react";
import {
  FilterSection,
  CheckboxGroup,
  ColorSwatchGrid,
} from "@/components/ui/filter-helpers";
import type { ManufacturerCount } from "@/lib/supabase/products";

export interface CollectionFilters {
  manufacturers: string[];
  collections: string[];
  colors: string[];
  sizes: string[];
  inStockOnly: boolean;
  priceMin: string;
  priceMax: string;
  sort: string;
}

interface CollectionSidebarProps {
  slug: string;
  manufacturerCounts: ManufacturerCount[];
  availableCollections: string[];
  availableColors: string[];
  availableSizes: string[];
  filters: CollectionFilters;
  onFiltersChange: (filters: CollectionFilters) => void;
}

export default function CollectionSidebar({
  slug,
  manufacturerCounts,
  availableCollections,
  availableColors,
  availableSizes,
  filters,
  onFiltersChange,
}: CollectionSidebarProps) {
  const [pendingMin, setPendingMin] = useState(filters.priceMin);
  const [pendingMax, setPendingMax] = useState(filters.priceMax);

  const isRug = slug === "rug";

  const update = (partial: Partial<CollectionFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const applyPrice = () => {
    update({ priceMin: pendingMin, priceMax: pendingMax });
  };

  const activeCount =
    filters.manufacturers.length +
    filters.collections.length +
    filters.colors.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  const clearAll = () => {
    setPendingMin("");
    setPendingMax("");
    onFiltersChange({
      manufacturers: [],
      collections: [],
      colors: [],
      sizes: [],
      inStockOnly: false,
      priceMin: "",
      priceMax: "",
      sort: filters.sort,
    });
  };

  const manufacturerNames = manufacturerCounts.map((m) => m.name);
  const countMap = Object.fromEntries(
    manufacturerCounts.map((m) => [m.name, m.count])
  );

  return (
    <div className="space-y-1">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="mb-3 text-xs font-medium text-[#2D4A3E] hover:underline"
        >
          Clear all filters ({activeCount})
        </button>
      )}

      {/* Manufacturer — hidden for rugs (show size/color instead) */}
      {!isRug && manufacturerCounts.length > 0 && (
        <FilterSection title="Manufacturer">
          <CheckboxGroup
            options={manufacturerNames}
            selected={filters.manufacturers}
            onChange={(manufacturers) => update({ manufacturers })}
            countMap={countMap}
          />
        </FilterSection>
      )}

      {/* Collection — furniture only */}
      {!isRug && availableCollections.length > 0 && (
        <FilterSection title="Collection" defaultOpen={false}>
          <CheckboxGroup
            options={availableCollections}
            selected={filters.collections}
            onChange={(collections) => update({ collections })}
          />
        </FilterSection>
      )}

      {/* Rug size */}
      {isRug && availableSizes.length > 0 && (
        <FilterSection title="Rug Size">
          <CheckboxGroup
            options={availableSizes}
            selected={filters.sizes}
            onChange={(sizes) => update({ sizes })}
          />
        </FilterSection>
      )}

      {/* Color — swatches for rugs, checkboxes for furniture */}
      {availableColors.length > 0 && (
        <FilterSection title="Color" defaultOpen={!isRug}>
          {isRug ? (
            <ColorSwatchGrid
              colors={availableColors}
              selected={filters.colors}
              onChange={(colors) => update({ colors })}
            />
          ) : (
            <CheckboxGroup
              options={availableColors}
              selected={filters.colors}
              onChange={(colors) => update({ colors })}
            />
          )}
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

      {/* Price range with Apply button */}
      <FilterSection title="Price">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={pendingMin}
              onChange={(e) => setPendingMin(e.target.value)}
              min={0}
              max={99999}
              className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
            />
            <span className="text-[#1C1C1C]/40">—</span>
            <input
              type="number"
              placeholder="Max"
              value={pendingMax}
              onChange={(e) => setPendingMax(e.target.value)}
              min={0}
              max={99999}
              className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
            />
          </div>
          <button
            type="button"
            onClick={applyPrice}
            className="w-full rounded bg-[#2D4A3E] py-1.5 text-xs font-medium text-[#FAF8F5] hover:bg-[#3B5E4F] transition-colors"
          >
            Apply
          </button>
        </div>
      </FilterSection>
    </div>
  );
}
