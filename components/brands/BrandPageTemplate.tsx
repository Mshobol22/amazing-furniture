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
import FilterSidebar, { type ActiveFilters, type FilterSection } from "@/components/filters/FilterSidebar";
import SmartSearchBar from "@/components/filters/SmartSearchBar";

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

export default function BrandPageTemplate({ manufacturer, config }: BrandPageTemplateProps) {
  const [categories, setCategories] = useState<ValueCount[]>([]);
  const [collections, setCollections] = useState<ValueCount[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "name-asc">("default");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [brandTotal, setBrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);
  const isMiscCategorySelected = selectedCategory === MISC_CATEGORY_VALUE;
  const hasCollections = collections.length > 0;

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
      setSelectedColors((current) => current.filter((c) => colorsData.includes(c)));
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
        colors: selectedColors.length > 0 ? selectedColors : undefined,
        material: selectedMaterial ?? undefined,
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
        sort,
        searchQuery: searchQuery || undefined,
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
    selectedColors,
    selectedMaterial,
    priceMin,
    priceMax,
    sort,
    searchQuery,
    page,
    hasCollections,
    isMiscCategorySelected,
    config?.defaultCategory,
  ]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedCollection, selectedColors, selectedMaterial, priceMin, priceMax, sort, searchQuery]);

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
    setSelectedColors([]);
    setSelectedMaterial(null);
    setPriceMin(null);
    setPriceMax(null);
    setSort("default");
  }

  function goToPage(nextPage: number) {
    const clamped = Math.min(totalPages, Math.max(1, nextPage));
    setPage(clamped);
    const anchor = document.getElementById("brand-products-grid");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sections: FilterSection[] = useMemo(() => {
    const list: FilterSection[] = [
      {
        id: "category",
        label: "Category",
        type: "checkbox",
        defaultOpen: true,
        options: [
          ...categories,
          ...(showMiscCategory
            ? [{ value: MISC_CATEGORY_VALUE, label: config?.miscCategoryLabel ?? "Other", count: miscCount }]
            : []),
        ],
      },
    ];
    if (hasCollections) {
      list.push({
        id: "collection",
        label: "Collection",
        type: "checkbox",
        defaultOpen: true,
        options: selectedCategory && !isMiscCategorySelected ? collections : [],
      });
    }
    if (colors.length > 0) {
      list.push({
        id: "color",
        label: "Color",
        type: "checkbox",
        defaultOpen: false,
        options: colors.map((c) => ({ value: c, count: 0 })),
      });
    }
    if (materials.length > 0) {
      list.push({
        id: "material",
        label: "Material",
        type: "checkbox",
        defaultOpen: false,
        options: materials.map((m) => ({ value: m, count: 0 })),
      });
    }
    list.push(
      { id: "price", label: "Price", type: "price_range", defaultOpen: false },
      {
        id: "sort",
        label: "Sort By",
        type: "sort",
        defaultOpen: true,
        options: [
          { value: "default", label: "Default", count: 0 },
          { value: "price-asc", label: "Price: Low to High", count: 0 },
          { value: "price-desc", label: "Price: High to Low", count: 0 },
          { value: "name-asc", label: "A to Z", count: 0 },
        ],
      }
    );
    return list;
  }, [
    categories,
    showMiscCategory,
    config?.miscCategoryLabel,
    miscCount,
    hasCollections,
    selectedCategory,
    isMiscCategorySelected,
    collections,
    colors,
    materials,
  ]);

  const activeFilters: ActiveFilters = {
    category: selectedCategory,
    collection: selectedCollection,
    color: selectedColors,
    material: selectedMaterial,
    priceMin,
    priceMax,
    sort,
  };

  const headerLogoSrc = brandLogoSrc(manufacturer.name, manufacturer.logo_url);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1C1C]">
      <header className="w-full border-b border-[#1E3329] bg-[#1E3329] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 text-center">
          {headerLogoSrc ? (
            <div
              className={
                manufacturer.slug === "zinatex"
                  ? "rounded-xl bg-[#1C1C1C] px-8 py-5"
                  : "contents"
              }
            >
              <Image
                src={headerLogoSrc}
                alt={`${manufacturer.name} logo`}
                width={280}
                height={160}
                className="max-w-[280px] object-contain"
                sizes="280px"
                priority
              />
            </div>
          ) : null}
          <h1 className="font-playfair text-3xl font-semibold text-[#FAF8F5] md:text-4xl">
            {manufacturer.name}
          </h1>
          <p className="max-w-3xl font-cormorant text-lg font-normal italic text-[#FAF8F5]/85">
            {manufacturer.description}
          </p>
          {manufacturer.heroTagline ? (
            <p className="rounded-full border border-[#FAF8F5]/40 bg-transparent px-4 py-1 font-sans text-sm font-medium text-[#FAF8F5]">
              {manufacturer.heroTagline}
            </p>
          ) : null}
          <p className="rounded-full border border-[#FAF8F5]/50 bg-transparent px-4 py-1 font-sans text-sm font-semibold text-[#FAF8F5]">
            {brandTotal.toLocaleString()} Products Available
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-[#1C1C1C]/10 bg-[#FAF8F5] p-4">
            <FilterSidebar
              sections={sections}
              activeFilters={activeFilters}
              onChange={(sectionId, value) => {
                if (sectionId === "category") {
                  const allowed = new Set([
                    ...categories.map((c) => c.value),
                    ...(showMiscCategory ? [MISC_CATEGORY_VALUE] : []),
                  ]);
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  setSelectedCategory(next);
                  setSelectedCollection(null);
                  setSelectedColors([]);
                  setSelectedMaterial(null);
                  return;
                }
                if (sectionId === "collection") {
                  const allowed = new Set(collections.map((c) => c.value));
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  setSelectedCollection(next);
                  setSelectedColors([]);
                  setSelectedMaterial(null);
                  return;
                }
                if (sectionId === "color") {
                  const allowed = new Set(colors);
                  const raw = Array.isArray(value) ? value : value ? [value] : [];
                  setSelectedColors(raw.filter((v) => allowed.has(v)));
                  return;
                }
                if (sectionId === "material") {
                  const allowed = new Set(materials);
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  setSelectedMaterial(next);
                  return;
                }
                if (sectionId === "priceMin") {
                  setPriceMin(typeof value === "string" && value ? Number(value) : null);
                  return;
                }
                if (sectionId === "priceMax") {
                  setPriceMax(typeof value === "string" && value ? Number(value) : null);
                  return;
                }
                if (sectionId === "sort") {
                  const allowed = new Set(["default", "price-asc", "price-desc", "name-asc"]);
                  if (typeof value === "string" && allowed.has(value)) {
                    setSort(value as "default" | "price-asc" | "price-desc" | "name-asc");
                  }
                }
              }}
              onClear={clearFilters}
            />
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
          <SmartSearchBar
            placeholder={`Search ${manufacturer.name} products`}
            onSearch={setSearchQuery}
            className="mb-4"
          />
          {searchQuery ? (
            <p className="mb-4 text-sm text-[#1C1C1C]/70">
              Showing {total.toLocaleString()} results for &quot;{searchQuery}&quot;
            </p>
          ) : null}

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
                <h2 className="font-sans text-lg font-semibold text-[#1C1C1C]">No products found</h2>
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
      <FilterSidebar
        sections={sections}
        activeFilters={activeFilters}
        onChange={(sectionId, value) => {
          if (sectionId === "category") {
            const allowed = new Set([
              ...categories.map((c) => c.value),
              ...(showMiscCategory ? [MISC_CATEGORY_VALUE] : []),
            ]);
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            setSelectedCategory(next);
            setSelectedCollection(null);
            setSelectedColors([]);
            setSelectedMaterial(null);
            return;
          }
          if (sectionId === "collection") {
            const allowed = new Set(collections.map((c) => c.value));
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            setSelectedCollection(next);
            setSelectedColors([]);
            setSelectedMaterial(null);
            return;
          }
          if (sectionId === "color") {
            const allowed = new Set(colors);
            const raw = Array.isArray(value) ? value : value ? [value] : [];
            setSelectedColors(raw.filter((v) => allowed.has(v)));
            return;
          }
          if (sectionId === "material") {
            const allowed = new Set(materials);
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            setSelectedMaterial(next);
            return;
          }
          if (sectionId === "priceMin") {
            setPriceMin(typeof value === "string" && value ? Number(value) : null);
            return;
          }
          if (sectionId === "priceMax") {
            setPriceMax(typeof value === "string" && value ? Number(value) : null);
            return;
          }
          if (sectionId === "sort") {
            const allowed = new Set(["default", "price-asc", "price-desc", "name-asc"]);
            if (typeof value === "string" && allowed.has(value)) {
              setSort(value as "default" | "price-asc" | "price-desc" | "name-asc");
            }
          }
        }}
        onClear={clearFilters}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
      />
    </div>
  );
}
