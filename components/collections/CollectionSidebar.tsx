"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  FilterSection,
  ColorSwatchGrid,
  COLOR_HEX,
} from "@/components/ui/filter-helpers";
import type { SubcategoryCount } from "@/lib/supabase/products";

interface CollectionSidebarProps {
  slug: string;
  availableSubcategories: SubcategoryCount[];
}

function parseArr(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

export default function CollectionSidebar({
  slug,
  availableSubcategories,
}: CollectionSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive selections from URL (stable string deps for effects)
  const typeParam = searchParams.get("type") ?? "";
  const manufacturerParam = searchParams.get("manufacturers") ?? "";
  const colorsParam = searchParams.get("colors") ?? "";
  const priceMinParam = searchParams.get("priceMin") ?? "";
  const priceMaxParam = searchParams.get("priceMax") ?? "";

  const selectedTypes = parseArr(typeParam);
  const selectedManufacturers = parseArr(manufacturerParam);
  const selectedColors = parseArr(colorsParam);

  // Dynamic filter options
  const [manufacturers, setManufacturers] = useState<{ name: string; count: number }[]>([]);
  const [colors, setColors] = useState<{ color: string; count: number }[]>([]);
  const [colorsAvailable, setColorsAvailable] = useState(false);
  const [mfrsLoading, setMfrsLoading] = useState(false);
  const [colorsLoading, setColorsLoading] = useState(false);

  // Local pending price (synced to URL on Apply)
  const [pendingMin, setPendingMin] = useState(priceMinParam);
  const [pendingMax, setPendingMax] = useState(priceMaxParam);

  const isRug = slug === "rug";

  // ── URL helper ────────────────────────────────────────────────────────────

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("page");
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // ── Toggle handlers ───────────────────────────────────────────────────────

  const toggleType = (name: string) => {
    const next = selectedTypes.includes(name)
      ? selectedTypes.filter((t) => t !== name)
      : [...selectedTypes, name];
    // Cascade: changing type resets brand + color
    pushParams({
      type: next.length > 0 ? next.join(",") : null,
      manufacturers: null,
      colors: null,
    });
  };

  const toggleManufacturer = (name: string) => {
    const next = selectedManufacturers.includes(name)
      ? selectedManufacturers.filter((m) => m !== name)
      : [...selectedManufacturers, name];
    // Cascade: changing brand resets color
    pushParams({
      manufacturers: next.length > 0 ? next.join(",") : null,
      colors: null,
    });
  };

  const toggleColor = (color: string) => {
    const next = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    pushParams({ colors: next.length > 0 ? next.join(",") : null });
  };

  const setColorArray = (arr: string[]) => {
    pushParams({ colors: arr.length > 0 ? arr.join(",") : null });
  };

  // ── Price ─────────────────────────────────────────────────────────────────

  const applyPrice = () => {
    pushParams({
      priceMin: pendingMin || null,
      priceMax: pendingMax || null,
    });
  };

  // Sync pending price with URL (e.g. browser back or clearAll)
  useEffect(() => { setPendingMin(priceMinParam); }, [priceMinParam]);
  useEffect(() => { setPendingMax(priceMaxParam); }, [priceMaxParam]);

  // ── Clear all ─────────────────────────────────────────────────────────────

  const activeCount =
    selectedTypes.length +
    selectedManufacturers.length +
    selectedColors.length +
    (priceMinParam ? 1 : 0) +
    (priceMaxParam ? 1 : 0);

  const clearAll = () => {
    setPendingMin("");
    setPendingMax("");
    const p = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) p.set("sort", sort);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ── Fetch manufacturers when type changes ─────────────────────────────────

  useEffect(() => {
    if (!typeParam) {
      setManufacturers([]);
      setColors([]);
      setColorsAvailable(false);
      return;
    }
    setMfrsLoading(true);
    fetch(
      `/api/collections/${slug}/filter-options?type=${encodeURIComponent(typeParam)}`
    )
      .then((r) => r.json())
      .then((d) => setManufacturers(d.manufacturers ?? []))
      .catch(() => setManufacturers([]))
      .finally(() => setMfrsLoading(false));
  }, [typeParam, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch colors when manufacturer changes ────────────────────────────────

  useEffect(() => {
    if (!typeParam || !manufacturerParam) {
      setColors([]);
      setColorsAvailable(false);
      return;
    }
    setColorsLoading(true);
    fetch(
      `/api/collections/${slug}/filter-options?type=${encodeURIComponent(typeParam)}&manufacturer=${encodeURIComponent(manufacturerParam)}`
    )
      .then((r) => r.json())
      .then((d) => {
        const list: { color: string; count: number }[] = d.colors ?? [];
        setColors(list);
        setColorsAvailable(list.length > 0);
      })
      .catch(() => {
        setColors([]);
        setColorsAvailable(false);
      })
      .finally(() => setColorsLoading(false));
  }, [typeParam, manufacturerParam, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Step 1 — Type: always shown when multiple options exist */}
      {availableSubcategories.length > 1 && (
        <FilterSection title="Type">
          <div className="max-h-[220px] space-y-2 overflow-y-auto">
            {availableSubcategories.map(({ name, count }) => (
              <label
                key={name}
                className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(name)}
                    onChange={() => toggleType(name)}
                    className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
                  />
                  {name}
                </span>
                <span className="text-xs text-[#1C1C1C]/40">
                  {count.toLocaleString()}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Step 2 — Brand: only after type is selected */}
      {selectedTypes.length > 0 && (
        <FilterSection title="Brand">
          {mfrsLoading ? (
            <p className="text-xs text-[#1C1C1C]/40">Loading…</p>
          ) : manufacturers.length === 0 ? (
            <p className="text-xs text-[#1C1C1C]/40">No brands found</p>
          ) : (
            <div className="max-h-[220px] space-y-2 overflow-y-auto">
              {manufacturers.map(({ name, count }) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedManufacturers.includes(name)}
                      onChange={() => toggleManufacturer(name)}
                      className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
                    />
                    {name}
                  </span>
                  <span className="text-xs text-[#1C1C1C]/40">
                    {count.toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          )}
        </FilterSection>
      )}

      {/* Step 3 — Color: only after brand selected AND colors exist */}
      {selectedManufacturers.length > 0 && colorsAvailable && (
        <FilterSection title="Color">
          {colorsLoading ? (
            <p className="text-xs text-[#1C1C1C]/40">Loading…</p>
          ) : isRug ? (
            <ColorSwatchGrid
              colors={colors.map((c) => c.color)}
              selected={selectedColors}
              onChange={setColorArray}
            />
          ) : (
            <div className="max-h-[220px] space-y-2 overflow-y-auto">
              {colors.map(({ color }) => (
                <label
                  key={color}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]"
                >
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(color)}
                    onChange={() => toggleColor(color)}
                    className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
                  />
                  {COLOR_HEX[color] && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-gray-300"
                      style={{ background: COLOR_HEX[color] }}
                    />
                  )}
                  <span>{color}</span>
                </label>
              ))}
            </div>
          )}
        </FilterSection>
      )}

      {/* Step 4 — Price: always shown */}
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
