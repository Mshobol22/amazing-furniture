"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types";
import {
  fetchBrandCategories,
  fetchBrandCollections,
  fetchBrandColors,
  fetchBrandMaterials,
  fetchBrandProducts,
} from "@/lib/brand-filters";
import { getPageWindow } from "@/lib/pagination";
import BrandProductGridCard from "@/components/products/BrandProductGridCard";
import { brandLogoSrc } from "@/lib/nfd-image-proxy";
import { LockIcon } from "@/components/filters/SteppedFilterSidebar";

interface BrandPageTemplateProps {
  manufacturer: {
    name: string;
    slug: string;
    description: string;
    logo_url: string | null;
    heroTagline?: string;
  };
  config?: {
    defaultCategory?: string;
    step2Label?: string;
    step3Label?: string;
    miscCategoryLabel?: string;
  };
}

type ValueCount = { value: string; count: number };
const PER_PAGE = 24;
const MISC_CATEGORY_VALUE = "__misc__";

function isLikelyCssColor(value: string): boolean {
  const v = value.trim();
  return (
    /^#[0-9a-fA-F]{3,8}$/.test(v) ||
    /^rgb\(/.test(v) ||
    /^hsl\(/.test(v)
  );
}

export default function BrandPageTemplate({ manufacturer, config }: BrandPageTemplateProps) {
  const step2Label = config?.step2Label ?? "Collection";
  const step3Label = config?.step3Label ?? "Refine";

  const [categories, setCategories] = useState<ValueCount[]>([]);
  const [collections, setCollections] = useState<ValueCount[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [brandTotal, setBrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);
  const isMiscCategorySelected = selectedCategory === MISC_CATEGORY_VALUE;
  const step1Active = selectedCategory !== null;
  const hasCollections = collections.length > 0;
  const step2Enabled = step1Active && hasCollections && !isMiscCategorySelected;
  const step3Enabled = step1Active;

  useEffect(() => {
    let ignore = false;
    async function loadCategories() {
      const data = await fetchBrandCategories(manufacturer.name);
      if (ignore) return;
      setCategories(data);

      const hasDefault = config?.defaultCategory
        ? data.some((c) => c.value === config.defaultCategory)
        : false;
      if (hasDefault) {
        setSelectedCategory(config?.defaultCategory ?? null);
      } else if (data.length > 0) {
        setSelectedCategory(data[0].value);
      }
    }

    loadCategories();
    fetchBrandProducts({ manufacturer: manufacturer.name, page: 1, perPage: 1 }).then((result) => {
      if (!ignore) setBrandTotal(result.total);
    });
    return () => {
      ignore = true;
    };
  }, [manufacturer.name, config?.defaultCategory]);

  useEffect(() => {
    let ignore = false;
    async function loadStep2And3() {
      if (!selectedCategory || isMiscCategorySelected) {
        setCollections([]);
        setColors([]);
        setMaterials([]);
        return;
      }

      const collectionsData = await fetchBrandCollections(manufacturer.name, selectedCategory);
      if (ignore) return;
      setCollections(collectionsData);

      const normalizedCollection =
        collectionsData.length > 0 && selectedCollection
          ? collectionsData.some((entry) => entry.value === selectedCollection)
            ? selectedCollection
            : null
          : null;
      setSelectedCollection(normalizedCollection);

      const [colorsData, materialsData] = await Promise.all([
        fetchBrandColors(manufacturer.name, selectedCategory, normalizedCollection ?? undefined),
        fetchBrandMaterials(manufacturer.name, selectedCategory, normalizedCollection ?? undefined),
      ]);

      if (ignore) return;
      setColors(colorsData);
      setMaterials(materialsData);
      setSelectedColor((current) => (current && colorsData.includes(current) ? current : null));
      setSelectedMaterial((current) =>
        current && materialsData.includes(current) ? current : null
      );
    }
    loadStep2And3();
    return () => {
      ignore = true;
    };
  }, [manufacturer.name, selectedCategory, selectedCollection, isMiscCategorySelected]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const result = await fetchBrandProducts({
        manufacturer: manufacturer.name,
        category:
          selectedCategory && !isMiscCategorySelected ? selectedCategory : undefined,
        excludeCategory:
          isMiscCategorySelected && config?.defaultCategory
            ? config.defaultCategory
            : undefined,
        collection: hasCollections ? selectedCollection ?? undefined : undefined,
        color: selectedColor ?? undefined,
        material: selectedMaterial ?? undefined,
        page,
        perPage: PER_PAGE,
      });
      setProducts(result.products);
      setTotal(result.total);
      setLoading(false);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [
    manufacturer.name,
    selectedCategory,
    selectedCollection,
    selectedColor,
    selectedMaterial,
    page,
    hasCollections,
    isMiscCategorySelected,
    config?.defaultCategory,
  ]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedCollection, selectedColor, selectedMaterial]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const showMiscCategory =
    Boolean(config?.miscCategoryLabel && config.defaultCategory) &&
    categories.some((c) => c.value !== config?.defaultCategory);
  const miscCount = categories
    .filter((entry) => entry.value !== config?.defaultCategory)
    .reduce((sum, entry) => sum + entry.count, 0);

  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  function clearFilters() {
    const fallbackCategory =
      config?.defaultCategory && categories.some((c) => c.value === config.defaultCategory)
        ? config.defaultCategory
        : categories[0]?.value ?? null;
    setSelectedCategory(fallbackCategory);
    setSelectedCollection(null);
    setSelectedColor(null);
    setSelectedMaterial(null);
  }

  function goToPage(nextPage: number) {
    const clamped = Math.min(totalPages, Math.max(1, nextPage));
    setPage(clamped);
    const anchor = document.getElementById("brand-products-grid");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sidebar = (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#1C1C1C]">Step 1: Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setSelectedCategory(item.value);
                setSelectedCollection(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === item.value
                  ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                  : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C] hover:border-[#2D4A3E]"
              }`}
            >
              {item.value} ({item.count})
            </button>
          ))}
          {showMiscCategory && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(MISC_CATEGORY_VALUE);
                setSelectedCollection(null);
                setSelectedColor(null);
                setSelectedMaterial(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === MISC_CATEGORY_VALUE
                  ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                  : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C] hover:border-[#2D4A3E]"
              }`}
            >
              {config?.miscCategoryLabel} ({miscCount})
            </button>
          )}
        </div>
      </section>

      {!step1Active || hasCollections ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1C1C1C]">Step 2: {step2Label}</h3>
            {!step2Enabled && <LockIcon />}
          </div>
          {step2Enabled ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCollection(null)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedCollection === null
                    ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                    : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C]"
                }`}
              >
                All Collections
              </button>
              {collections.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedCollection(item.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selectedCollection === item.value
                      ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                      : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C]"
                  }`}
                >
                  {item.value} ({item.count})
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#1C1C1C]/20 bg-white/60 p-3 text-xs text-[#1C1C1C]/55">
              {isMiscCategorySelected
                ? "Collections are unavailable for Other Items."
                : "Choose a category first."}
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1C1C]">Step 3: {step3Label}</h3>
          {!step3Enabled && <LockIcon />}
        </div>
        {step3Enabled ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#1C1C1C]/60">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.length === 0 && (
                  <span className="text-xs text-[#1C1C1C]/55">No colors available.</span>
                )}
                {colors.map((color) => {
                  const canSwatch = isLikelyCssColor(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor((prev) => (prev === color ? null : color))}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                        selectedColor === color
                          ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                          : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C]"
                      }`}
                    >
                      {canSwatch ? (
                        <span
                          className="h-3 w-3 rounded-full border border-[#1C1C1C]/20"
                          style={{ backgroundColor: color }}
                        />
                      ) : null}
                      <span>{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#1C1C1C]/60">
                Material
              </p>
              <div className="flex flex-wrap gap-2">
                {materials.length === 0 && (
                  <span className="text-xs text-[#1C1C1C]/55">No materials available.</span>
                )}
                {materials.map((material) => (
                  <button
                    key={material}
                    type="button"
                    onClick={() =>
                      setSelectedMaterial((prev) => (prev === material ? null : material))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      selectedMaterial === material
                        ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                        : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C]"
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#1C1C1C]/20 bg-white/60 p-3 text-xs text-[#1C1C1C]/55">
            Complete step 1 first.
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={clearFilters}
        className="w-full rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm font-medium text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
      >
        Clear Filters
      </button>
    </div>
  );

  const headerLogoSrc = brandLogoSrc(manufacturer.name, manufacturer.logo_url);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1C1C]">
      <header className="w-full bg-[#2D4A3E] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 text-center">
          {headerLogoSrc ? (
            <div className="relative h-20 w-48">
              <Image
                src={headerLogoSrc}
                alt={`${manufacturer.name} logo`}
                fill
                className="object-contain"
                sizes="192px"
              />
            </div>
          ) : null}
          <h1 className="text-3xl font-semibold text-[#FAF8F5] sm:text-4xl">{manufacturer.name}</h1>
          <p className="max-w-3xl text-sm text-[#FAF8F5]/90 sm:text-base">{manufacturer.description}</p>
          {manufacturer.heroTagline ? (
            <p className="rounded-full border border-[#FAF8F5]/30 bg-[#FAF8F5]/10 px-4 py-1 text-sm font-medium text-[#FAF8F5]">
              {manufacturer.heroTagline}
            </p>
          ) : null}
          <p className="rounded-full bg-[#FAF8F5] px-4 py-1 text-sm font-semibold text-[#2D4A3E]">
            {brandTotal.toLocaleString()} Products Available
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
              Showing {from.toLocaleString()}-{to.toLocaleString()} of {total.toLocaleString()} products
            </p>
          </div>

          <div id="brand-products-grid">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-xl border border-[#1C1C1C]/10 bg-white p-3">
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
                  onClick={clearFilters}
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
