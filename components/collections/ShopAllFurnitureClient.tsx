"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SteppedFilterSidebar, {
  type ActiveFilters,
  type FilterStep,
} from "@/components/filters/SteppedFilterSidebar";
import BrandProductGridCard from "@/components/products/BrandProductGridCard";
import { getPageWindow } from "@/lib/pagination";
import {
  fetchAllCategories,
  fetchAllProducts,
  fetchColorsForFilters,
  fetchManufacturersForCategory,
  fetchMaterialsForFilters,
} from "@/lib/brand-filters";
import type { Product } from "@/types";

const PER_PAGE = 24;

const CATEGORY_DISPLAY: Record<string, string> = {
  sofa: "Sofas & Sectionals",
  bed: "Beds",
  "bedroom-furniture": "Bedroom Furniture",
  chair: "Chairs & Recliners",
  table: "Dining & Tables",
  cabinet: "Cabinets & Storage",
  "tv-stand": "TV Stands & Entertainment",
  rug: "Rugs & Floor Coverings",
  other: "More Furniture",
};

type ValueCount = { value: string; count: number };

export default function ShopAllFurnitureClient() {
  const [categoryOptions, setCategoryOptions] = useState<ValueCount[]>([]);
  const [manufacturers, setManufacturers] = useState<ValueCount[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    category: null,
    brand: null,
    color: null,
    material: null,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categoriesReady, setCategoriesReady] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);

  const showBrandStep = manufacturers.length > 1;

  const effectiveManufacturer = useMemo(() => {
    if (showBrandStep) {
      return activeFilters.brand ? String(activeFilters.brand) : undefined;
    }
    if (manufacturers.length === 1) {
      return manufacturers[0].value;
    }
    return undefined;
  }, [showBrandStep, activeFilters.brand, manufacturers]);

  useEffect(() => {
    let ignore = false;
    fetchAllProducts({ page: 1, perPage: 1 }).then((r) => {
      if (!ignore) setCatalogTotal(r.total);
    });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const cats = await fetchAllCategories();
      if (ignore) return;
      setCategoryOptions(cats);
      setActiveFilters((f) =>
        f.category ? f : { ...f, category: cats[0]?.value ?? null }
      );
      if (cats.length === 0) {
        setLoading(false);
      }
      setCategoriesReady(true);
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const cat = activeFilters.category;
    if (!cat) {
      setManufacturers([]);
      return;
    }
    let ignore = false;
    fetchManufacturersForCategory(cat).then((mfrs) => {
      if (ignore) return;
      setManufacturers(mfrs);
    });
    return () => {
      ignore = true;
    };
  }, [activeFilters.category]);

  useEffect(() => {
    const cat = activeFilters.category;
    if (!cat) {
      setColors([]);
      setMaterials([]);
      return;
    }
    const categoryKey = cat;
    let ignore = false;
    async function load() {
      const mfr = effectiveManufacturer;
      const [c, m] = await Promise.all([
        fetchColorsForFilters({ category: categoryKey, manufacturer: mfr }),
        fetchMaterialsForFilters({ category: categoryKey, manufacturer: mfr }),
      ]);
      if (ignore) return;
      setColors(c);
      setMaterials(m);
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeFilters.category, effectiveManufacturer]);

  useEffect(() => {
    setActiveFilters((prev) => {
      const nextC = prev.color && colors.includes(String(prev.color)) ? prev.color : null;
      const nextM =
        prev.material && materials.includes(String(prev.material)) ? prev.material : null;
      if (prev.color === nextC && prev.material === nextM) return prev;
      return { ...prev, color: nextC, material: nextM };
    });
  }, [colors, materials]);

  useEffect(() => {
    const cat = activeFilters.category;
    if (!cat) {
      if (categoriesReady) {
        setLoading(false);
        setProducts([]);
        setTotal(0);
      }
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const result = await fetchAllProducts({
        category: cat,
        manufacturer: effectiveManufacturer,
        color: activeFilters.color ? String(activeFilters.color) : undefined,
        material: activeFilters.material ? String(activeFilters.material) : undefined,
        page,
        perPage: PER_PAGE,
      });
      setProducts(result.products);
      setTotal(result.total);
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [
    activeFilters.category,
    activeFilters.color,
    activeFilters.material,
    effectiveManufacturer,
    page,
    categoriesReady,
  ]);

  useEffect(() => {
    setPage(1);
  }, [activeFilters.category, activeFilters.brand, activeFilters.color, activeFilters.material]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const steps: FilterStep[] = useMemo(() => {
    const list: FilterStep[] = [
      {
        id: "category",
        label: "Step 1: Category",
        options: categoryOptions.map((c) => ({
          value: c.value,
          count: c.count,
          displayLabel: CATEGORY_DISPLAY[c.value] ?? c.value,
        })),
      },
    ];

    if (showBrandStep) {
      list.push({
        id: "brand",
        label: "Step 2: Brand",
        dependsOn: "category",
        resetWhen: ["category"],
        clearPill: { label: "All Brands" },
        options: manufacturers.map((m) => ({ value: m.value, count: m.count })),
      });
    }

    list.push(
      {
        id: "color",
        label: "Color",
        options: colors.map((c) => ({ value: c, count: 0 })),
        dependsOn: "category",
        resetWhen: ["category", "brand"],
        colorSwatches: true,
        toggleable: true,
        hideCountsWhenZero: true,
        visualGroupId: "refine",
        visualGroupTitle: "Step 3: Color & Material",
      },
      {
        id: "material",
        label: "Material",
        options: materials.map((m) => ({ value: m, count: 0 })),
        dependsOn: "category",
        resetWhen: ["category", "brand"],
        toggleable: true,
        hideCountsWhenZero: true,
        visualGroupId: "refine",
      }
    );

    return list;
  }, [categoryOptions, manufacturers, colors, materials, showBrandStep]);

  const handleClear = useCallback(() => {
    const first = categoryOptions[0]?.value ?? null;
    setActiveFilters({
      category: first,
      brand: null,
      color: null,
      material: null,
    });
    setPage(1);
  }, [categoryOptions]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(totalPages, Math.max(1, nextPage));
      setPage(clamped);
      const anchor = document.getElementById("all-products-grid");
      if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [totalPages]
  );

  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  const sidebar = (
    <SteppedFilterSidebar
      steps={steps}
      activeFilters={activeFilters}
      onChange={setActiveFilters}
      onClear={handleClear}
    />
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1C1C]">
      <header className="on-forest-surface w-full bg-[#2D4A3E] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold text-[#FAF8F5] sm:text-4xl">Shop All Furniture</h1>
          <p className="max-w-3xl text-sm text-[#FAF8F5]/90 sm:text-base">
            Browse our complete collection from all brands
          </p>
          <p className="rounded-full bg-[#FAF8F5] px-4 py-1 text-sm font-semibold text-[#2D4A3E]">
            {catalogTotal.toLocaleString()} Products Available
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-[#1C1C1C]/10 bg-[#FAF8F5] p-4">
            {sidebar}
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm font-medium lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filters
            </button>
            <p className="text-sm text-[#1C1C1C]/70">
              Showing {from.toLocaleString()}-{to.toLocaleString()} of {total.toLocaleString()}{" "}
              products
            </p>
          </div>

          <div id="all-products-grid">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="animate-pulse rounded-xl border border-[#1C1C1C]/10 bg-white p-3"
                  >
                    <div className="mb-3 aspect-[4/3] rounded bg-[#1C1C1C]/10" />
                    <div className="mb-2 h-4 w-3/4 rounded bg-[#1C1C1C]/10" />
                    <div className="h-4 w-1/3 rounded bg-[#1C1C1C]/10" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-8 text-center">
                <h2 className="text-lg font-semibold text-[#1C1C1C]">No products found</h2>
                <button
                  type="button"
                  onClick={handleClear}
                  className="mt-3 rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-[#FAF8F5]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <BrandProductGridCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {getPageWindow(page, totalPages).map((item, idx) =>
              item === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-sm text-[#1C1C1C]/40">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => goToPage(item as number)}
                  className={`h-9 min-w-9 rounded-lg border px-2 text-sm ${
                    item === page
                      ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                      : "border-[#1C1C1C]/15 bg-white"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </main>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#FAF8F5] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1C1C1C]">Filters</h2>
              <button
                type="button"
                className="rounded p-1 text-[#1C1C1C]/70"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Close
              </button>
            </div>
            {sidebar}
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-[#FAF8F5]"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show Results
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
