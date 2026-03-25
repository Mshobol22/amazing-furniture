"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import FilterSidebar, {
  type ActiveFilters,
  type FilterSection,
} from "@/components/filters/FilterSidebar";
import type { SubcategoryCount } from "@/lib/supabase/products";

interface CollectionSidebarProps {
  slug: string;
  availableSubcategories: SubcategoryCount[];
  categoryCounts?: { slug: string; name: string; count: number }[];
  allBrands?: { name: string; count: number }[];
}

function parseArr(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

export default function CollectionSidebar({
  slug,
  availableSubcategories,
  categoryCounts = [],
  allBrands = [],
}: CollectionSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive selections from URL (stable string deps for effects)
  const isAll = slug === "all";
  const typeParam = searchParams.get("type") ?? "";
  const manufacturerParam = searchParams.get("manufacturers") ?? "";
  const colorsParam = searchParams.get("colors") ?? "";
  const priceMinParam = searchParams.get("priceMin") ?? "";
  const priceMaxParam = searchParams.get("priceMax") ?? "";
  const allCategoryParam = searchParams.get("category") ?? "";
  const allManufacturerParam = searchParams.get("manufacturer") ?? "";
  const allPriceMinParam = searchParams.get("minPrice") ?? "";
  const allPriceMaxParam = searchParams.get("maxPrice") ?? "";

  const selectedTypes = parseArr(typeParam);
  const selectedManufacturers = parseArr(manufacturerParam);
  const selectedColors = parseArr(colorsParam);
  const selectedAllCategories = parseArr(allCategoryParam);
  const selectedAllManufacturers = parseArr(allManufacturerParam);

  // Dynamic filter options
  const [manufacturers, setManufacturers] = useState<{ name: string; count: number }[]>([]);
  const [colors, setColors] = useState<{ color: string; count: number }[]>([]);
  const [colorsAvailable, setColorsAvailable] = useState(false);
  const [mfrsLoading, setMfrsLoading] = useState(false);
  const [colorsLoading, setColorsLoading] = useState(false);

  // Local pending price (synced to URL on Apply)
  const [pendingMin, setPendingMin] = useState(isAll ? allPriceMinParam : priceMinParam);
  const [pendingMax, setPendingMax] = useState(isAll ? allPriceMaxParam : priceMaxParam);

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

  // Sync pending price with URL (e.g. browser back or clearAll)
  useEffect(() => { setPendingMin(isAll ? allPriceMinParam : priceMinParam); }, [isAll, allPriceMinParam, priceMinParam]);
  useEffect(() => { setPendingMax(isAll ? allPriceMaxParam : priceMaxParam); }, [isAll, allPriceMaxParam, priceMaxParam]);

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

  const sections: FilterSection[] = [];

  if (isAll) {
    sections.push(
      {
        id: "category",
        label: "Category",
        type: "checkbox",
        defaultOpen: true,
        options: categoryCounts.map(({ slug: categorySlug, name, count }) => ({
          value: categorySlug,
          label: name,
          count,
        })),
      },
      {
        id: "manufacturer",
        label: "Brand",
        type: "checkbox",
        defaultOpen: true,
        options: allBrands.map(({ name, count }) => ({ value: name, count, label: name })),
      }
    );
  } else {
    if (availableSubcategories.length > 1) {
      sections.push({
        id: "type",
        label: "Type",
        type: "checkbox",
        defaultOpen: true,
        options: availableSubcategories.map(({ name, count }) => ({ value: name, count, label: name })),
      });
    }
    if (selectedTypes.length > 0 && !mfrsLoading && manufacturers.length > 0) {
      sections.push({
        id: "manufacturers",
        label: "Brand",
        type: "checkbox",
        defaultOpen: true,
        options: manufacturers.map(({ name, count }) => ({ value: name, count, label: name })),
      });
    }
    if (selectedManufacturers.length > 0 && !colorsLoading && colorsAvailable) {
      sections.push({
        id: "colors",
        label: "Color",
        type: "checkbox",
        defaultOpen: false,
        options: colors.map(({ color, count }) => ({ value: color, count, label: color })),
      });
    }
  }

  sections.push({
    id: "price",
    label: "Price",
    type: "price_range",
    defaultOpen: false,
  });

  const activeFilters: ActiveFilters = isAll
    ? {
        category: selectedAllCategories,
        manufacturer: selectedAllManufacturers,
        priceMin: allPriceMinParam ? Number(allPriceMinParam) : null,
        priceMax: allPriceMaxParam ? Number(allPriceMaxParam) : null,
      }
    : {
        type: selectedTypes,
        manufacturers: selectedManufacturers,
        colors: selectedColors,
        priceMin: priceMinParam ? Number(priceMinParam) : null,
        priceMax: priceMaxParam ? Number(priceMaxParam) : null,
      };

  return (
    <FilterSidebar
      sections={sections}
      activeFilters={activeFilters}
      onChange={(filterId, value) => {
        if (filterId === "priceMin" || filterId === "priceMax") {
          const nextValue = typeof value === "string" ? value : null;
          if (isAll) {
            pushParams({
              minPrice: filterId === "priceMin" ? nextValue : pendingMin || null,
              maxPrice: filterId === "priceMax" ? nextValue : pendingMax || null,
            });
          } else {
            pushParams({
              priceMin: filterId === "priceMin" ? nextValue : pendingMin || null,
              priceMax: filterId === "priceMax" ? nextValue : pendingMax || null,
            });
          }
          if (filterId === "priceMin") setPendingMin(typeof value === "string" ? value : "");
          if (filterId === "priceMax") setPendingMax(typeof value === "string" ? value : "");
          return;
        }

        if (filterId === "type") {
          const allowed = new Set(availableSubcategories.map((s) => s.name));
          const raw = Array.isArray(value) ? value : value ? [value] : [];
          const safe = raw.filter((v) => allowed.has(v));
          pushParams({
            type: safe.length > 0 ? safe.join(",") : null,
            manufacturers: null,
            colors: null,
          });
          return;
        }

        if (filterId === "manufacturers") {
          const allowed = new Set(manufacturers.map((m) => m.name));
          const raw = Array.isArray(value) ? value : value ? [value] : [];
          const safe = raw.filter((v) => allowed.has(v));
          pushParams({
            manufacturers: safe.length > 0 ? safe.join(",") : null,
            colors: null,
          });
          return;
        }

        if (filterId === "colors") {
          const allowed = new Set(colors.map((c) => c.color));
          const raw = Array.isArray(value) ? value : value ? [value] : [];
          const safe = raw.filter((v) => allowed.has(v));
          pushParams({ colors: safe.length > 0 ? safe.join(",") : null });
          return;
        }

        if (filterId === "category") {
          const allowed = new Set(categoryCounts.map((c) => c.slug));
          const raw = Array.isArray(value) ? value : value ? [value] : [];
          const safe = raw.filter((v) => allowed.has(v));
          pushParams({ category: safe.length > 0 ? safe.join(",") : null });
          return;
        }

        if (filterId === "manufacturer") {
          const allowed = new Set(allBrands.map((b) => b.name));
          const raw = Array.isArray(value) ? value : value ? [value] : [];
          const safe = raw.filter((v) => allowed.has(v));
          pushParams({ manufacturer: safe.length > 0 ? safe.join(",") : null });
        }
      }}
      onClear={clearAll}
    />
  );
}
