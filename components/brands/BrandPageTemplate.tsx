"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    description: string | null;
    logo_url: string | null;
    heroTagline?: string;
  };
  config?: {
    defaultCategory?: string;
    step2Label?: string;
    step3Label?: string;
    miscCategoryLabel?: string;
  };
  initialProductCount?: number;
}

type ValueCount = { value: string; count: number };
const PER_PAGE = 15;
const MISC_CATEGORY_VALUE = "__misc__";

function parseCommaParam(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumberParam(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeSortParam(v: string | null): "default" | "price-asc" | "price-desc" | "name-asc" {
  const allowed = new Set(["default", "price-asc", "price-desc", "name-asc"]);
  const val = v?.trim() ?? "";
  return allowed.has(val) ? (val as any) : "default";
}

export default function BrandPageTemplate({ manufacturer, config, initialProductCount }: BrandPageTemplateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [categories, setCategories] = useState<ValueCount[]>([]);
  const [collections, setCollections] = useState<ValueCount[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [brandTotal, setBrandTotal] = useState(initialProductCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const productGridRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledOnMount = useRef(false);
  const pendingPriceRef = useRef<{ min: number | null; max: number | null; timer: number | null }>({
    min: null,
    max: null,
    timer: null,
  });

  const usesCollectionAsCategory =
    manufacturer.slug === "zinatex" || manufacturer.name === "Zinatex";
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);
  const urlPageRaw = searchParams.get("page");
  const page = Math.max(1, Math.min(parseNumberParam(urlPageRaw) ?? 1, 500));

  const urlMinPrice = searchParams.get("minPrice") ?? searchParams.get("priceMin");
  const urlMaxPrice = searchParams.get("maxPrice") ?? searchParams.get("priceMax");
  const priceMin = parseNumberParam(urlMinPrice);
  const priceMax = parseNumberParam(urlMaxPrice);

  const sort = normalizeSortParam(searchParams.get("sort"));

  const urlCategoryParam = usesCollectionAsCategory
    ? null
    : searchParams.get("category")?.trim() ?? null;
  // Zinatex (usesCollectionAsCategory): the "category" filter is persisted in `collection`.
  // Non-Zinatex: `collection` is the step-2 filter (series/collection name).
  const urlCollectionParam = searchParams.get("collection")?.trim() ?? null;

  const showMiscCategory =
    !usesCollectionAsCategory &&
    Boolean(config?.miscCategoryLabel && config.defaultCategory) &&
    categories.some((c) => c.value !== config?.defaultCategory);

  const allowedCategoryValues = useMemo(() => {
    const vals = categories.map((c) => c.value);
    if (showMiscCategory) vals.push(MISC_CATEGORY_VALUE);
    return new Set(vals);
  }, [categories, showMiscCategory]);

  const fallbackCategory =
    (config?.defaultCategory && allowedCategoryValues.has(config.defaultCategory)
      ? config.defaultCategory
      : categories[0]?.value ?? null) ?? null;

  const selectedCategoryParamCandidate = usesCollectionAsCategory ? urlCollectionParam : urlCategoryParam;
  const selectedCategory = (selectedCategoryParamCandidate &&
    allowedCategoryValues.has(selectedCategoryParamCandidate)
    ? selectedCategoryParamCandidate
    : fallbackCategory) as string | null;

  const isMiscCategorySelected = selectedCategory === MISC_CATEGORY_VALUE;
  const hasCollections = !usesCollectionAsCategory && collections.length > 0;

  const selectedCollection: string | null =
    !usesCollectionAsCategory && urlCollectionParam
      ? collections.some((c) => c.value === urlCollectionParam)
        ? urlCollectionParam
        : null
      : null;

  const rawColorParam = useMemo(() => {
    return new URLSearchParams(searchParamsKey).get("colors");
  }, [searchParamsKey]);

  const rawMaterialParam = useMemo(() => {
    return new URLSearchParams(searchParamsKey).get("material");
  }, [searchParamsKey]);

  const selectedColors = useMemo(() => {
    return parseCommaParam(rawColorParam).filter((c) => colors.includes(c));
  }, [rawColorParam, colors]);

  const selectedMaterial = useMemo(() => {
    const mat = rawMaterialParam?.trim() ?? null;
    if (!mat) return null;
    return materials.includes(mat) ? mat : null;
  }, [rawMaterialParam, materials]);
  const selectedColorsKey = useMemo(() => selectedColors.join(","), [selectedColors]);

  useEffect(() => {
    let ignore = false;
    async function loadCategories() {
      const data = await fetchBrandCategories(
        manufacturer.name,
        usesCollectionAsCategory ? "collection" : "category"
      );
      if (ignore) return;
      const normalized = usesCollectionAsCategory
        ? [...data].sort((a, b) => a.value.localeCompare(b.value))
        : data;
      setCategories(normalized);
    }

    loadCategories();
    fetchBrandProducts({ manufacturer: manufacturer.name, page: 1, perPage: 1 }).then((result) => {
      if (!ignore) setBrandTotal(result.total);
    });
    return () => {
      ignore = true;
    };
  }, [manufacturer.name, usesCollectionAsCategory]);

  useEffect(() => {
    let ignore = false;
    async function loadStep2And3() {
      if (!selectedCategory || (isMiscCategorySelected && !usesCollectionAsCategory)) {
        setCollections([]);
        setColors([]);
        setMaterials([]);
        return;
      }

      if (!usesCollectionAsCategory) {
        const collectionsData = await fetchBrandCollections(manufacturer.name, selectedCategory);
        if (ignore) return;
        setCollections(collectionsData);

        const normalizedCollection =
          urlCollectionParam && collectionsData.some((entry) => entry.value === urlCollectionParam)
            ? urlCollectionParam
            : null;

        const [colorsData, materialsData] = await Promise.all([
          fetchBrandColors(manufacturer.name, selectedCategory, normalizedCollection ?? undefined),
          fetchBrandMaterials(manufacturer.name, selectedCategory, normalizedCollection ?? undefined),
        ]);

        if (ignore) return;
        setColors(colorsData);
        setMaterials(materialsData);
        return;
      }

      // Zinatex mode: the category selection is stored in `collection` and maps to the
      // filter's `collection` column when fetching products.
      setCollections([]);
      const [colorsData, materialsData] = await Promise.all([
        fetchBrandColors(manufacturer.name, undefined, selectedCategory ?? undefined),
        fetchBrandMaterials(manufacturer.name, undefined, selectedCategory ?? undefined),
      ]);

      if (ignore) return;
      setColors(colorsData);
      setMaterials(materialsData);
    }
    loadStep2And3();
    return () => {
      ignore = true;
    };
  }, [
    manufacturer.name,
    selectedCategory,
    isMiscCategorySelected,
    usesCollectionAsCategory,
    urlCollectionParam,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      // Avoid fetching with incomplete filter option lists (prevents flicker on back navigation).
      if (!selectedCategory) return;
      if (
        !usesCollectionAsCategory &&
        urlCollectionParam &&
        collections.length === 0 &&
        !isMiscCategorySelected
      ) {
        return;
      }
      const urlColorsRaw = parseCommaParam(rawColorParam);
      if (!usesCollectionAsCategory && urlColorsRaw.length > 0 && colors.length === 0) {
        return;
      }
      const urlMaterialRaw = rawMaterialParam?.trim() ?? "";
      if (!usesCollectionAsCategory && urlMaterialRaw && materials.length === 0) {
        return;
      }

      setLoading(true);
      const result = await fetchBrandProducts({
        manufacturer: manufacturer.name,
        category:
          usesCollectionAsCategory
            ? undefined
            : selectedCategory && !isMiscCategorySelected
              ? selectedCategory
              : undefined,
        excludeCategory:
          !usesCollectionAsCategory &&
          isMiscCategorySelected &&
          config?.defaultCategory
            ? config.defaultCategory
            : undefined,
        collection: (() => {
          if (usesCollectionAsCategory) {
            return selectedCategory ? selectedCategory : undefined;
          }
          if (!hasCollections) return undefined;
          return selectedCollection ? selectedCollection : undefined;
        })(),
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
    usesCollectionAsCategory,
    rawColorParam,
    rawMaterialParam,
    colors.length,
    materials.length,
    collections.length,
    urlCollectionParam,
  ]);

  const miscCount = categories
    .filter((entry) => entry.value !== config?.defaultCategory)
    .reduce((sum, entry) => sum + entry.count, 0);

  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  useEffect(() => {
    // Ensure we land on the product grid when filters/pagination change (including back).
    if (!hasScrolledOnMount.current) {
      hasScrolledOnMount.current = true;
      return;
    }
    productGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [
    selectedCategory,
    selectedCollection,
    selectedColorsKey,
    selectedMaterial,
    priceMin,
    priceMax,
    sort,
    page,
  ]);

  const replaceUrlParams = useCallback(
    (updates: Record<string, string | null>, opts?: { resetPage?: boolean }) => {
      const p = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") p.delete(key);
        else p.set(key, value);
      }
      if (opts?.resetPage) p.set("page", "1");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const commitPendingPriceToUrl = useCallback(() => {
    if (pendingPriceRef.current.timer != null) {
      window.clearTimeout(pendingPriceRef.current.timer);
    }
    pendingPriceRef.current.timer = window.setTimeout(() => {
      const { min, max } = pendingPriceRef.current;
      replaceUrlParams(
        {
          minPrice: min != null ? String(min) : null,
          maxPrice: max != null ? String(max) : null,
        },
        { resetPage: true }
      );
    }, 0);
  }, [replaceUrlParams]);

  function clearFilters() {
    if (!fallbackCategory) return;

    if (usesCollectionAsCategory) {
      replaceUrlParams(
        {
          // The category selection for Zinatex is stored in `collection`.
          collection: fallbackCategory,
          page: "1",
          category: null,
          // Clear dependent filters.
          colors: null,
          material: null,
          minPrice: null,
          maxPrice: null,
          sort: null,
        },
        { resetPage: false }
      );
      return;
    }

    replaceUrlParams(
      {
        category: fallbackCategory,
        // Clear step-2/3 filters.
        collection: null,
        colors: null,
        material: null,
        minPrice: null,
        maxPrice: null,
        sort: null,
        page: "1",
      },
      { resetPage: false }
    );
  }

  function goToPage(nextPage: number) {
    const clamped = Math.min(totalPages, Math.max(1, nextPage));
    replaceUrlParams({ page: String(clamped) }, { resetPage: false });
  }

  const sections: FilterSection[] = useMemo(() => {
    const list: FilterSection[] = [
      {
        id: "category",
        label: usesCollectionAsCategory ? "Category" : "Category",
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
    usesCollectionAsCategory,
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
  const featuredProducts = products.slice(0, 4);

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

      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden self-start lg:block">
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

                  if (usesCollectionAsCategory) {
                    replaceUrlParams(
                      {
                        collection: next,
                        category: null,
                        colors: null,
                        material: null,
                      },
                      { resetPage: true }
                    );
                  } else {
                    replaceUrlParams(
                      {
                        category: next,
                        // Changing category clears the step-2 collection + step-3 filters.
                        collection: null,
                        colors: null,
                        material: null,
                      },
                      { resetPage: true }
                    );
                  }
                  return;
                }

                if (sectionId === "collection") {
                  if (usesCollectionAsCategory) return;
                  const allowed = new Set(collections.map((c) => c.value));
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  replaceUrlParams(
                    {
                      collection: next,
                      colors: null,
                      material: null,
                    },
                    { resetPage: true }
                  );
                  return;
                }

                if (sectionId === "color") {
                  const allowed = new Set(colors);
                  const raw = Array.isArray(value) ? value : value ? [value] : [];
                  const nextColors = raw.filter((v) => allowed.has(v));
                  replaceUrlParams(
                    {
                      colors: nextColors.length > 0 ? nextColors.join(",") : null,
                    },
                    { resetPage: true }
                  );
                  return;
                }

                if (sectionId === "material") {
                  const allowed = new Set(materials);
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  replaceUrlParams({ material: next }, { resetPage: true });
                  return;
                }

                if (sectionId === "priceMin") {
                  pendingPriceRef.current.min =
                    typeof value === "string" && value ? parseNumberParam(value) : null;
                  commitPendingPriceToUrl();
                  return;
                }

                if (sectionId === "priceMax") {
                  pendingPriceRef.current.max =
                    typeof value === "string" && value ? parseNumberParam(value) : null;
                  commitPendingPriceToUrl();
                  return;
                }

                if (sectionId === "sort") {
                  const allowed = new Set(["default", "price-asc", "price-desc", "name-asc"]);
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  replaceUrlParams({ sort: next }, { resetPage: true });
                }
              }}
              onClear={clearFilters}
            />
          </div>
        </aside>

        <main className="min-w-0">
          {!loading && featuredProducts.length > 0 ? (
            <section className="mb-6 rounded-xl border border-[#1C1C1C]/10 bg-white p-4">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-lg font-semibold text-[#1C1C1C]">Featured picks</h2>
                <p className="text-xs uppercase tracking-wide text-[#6B6560]">{manufacturer.name}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featuredProducts.map((product) => (
                  <BrandProductGridCard
                    key={`featured-${product.id}`}
                    product={product}
                    brandName={manufacturer.name}
                    categoryFilter={
                      selectedCategory && !isMiscCategorySelected
                        ? selectedCategory
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
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

          <div id="brand-products-grid" ref={productGridRef}>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: PER_PAGE }).map((_, idx) => (
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
                  <BrandProductGridCard
                    key={product.id}
                    product={product}
                    brandName={manufacturer.name}
                    categoryFilter={
                      selectedCategory && !isMiscCategorySelected
                        ? selectedCategory
                        : undefined
                    }
                  />
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

            if (usesCollectionAsCategory) {
              replaceUrlParams(
                {
                  collection: next,
                  category: null,
                  colors: null,
                  material: null,
                },
                { resetPage: true }
              );
            } else {
              replaceUrlParams(
                {
                  category: next,
                  collection: null,
                  colors: null,
                  material: null,
                },
                { resetPage: true }
              );
            }
            return;
          }

          if (sectionId === "collection") {
            if (usesCollectionAsCategory) return;
            const allowed = new Set(collections.map((c) => c.value));
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            replaceUrlParams(
              {
                collection: next,
                colors: null,
                material: null,
              },
              { resetPage: true }
            );
            return;
          }

          if (sectionId === "color") {
            const allowed = new Set(colors);
            const raw = Array.isArray(value) ? value : value ? [value] : [];
            const nextColors = raw.filter((v) => allowed.has(v));
            replaceUrlParams(
              {
                colors: nextColors.length > 0 ? nextColors.join(",") : null,
              },
              { resetPage: true }
            );
            return;
          }

          if (sectionId === "material") {
            const allowed = new Set(materials);
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            replaceUrlParams({ material: next }, { resetPage: true });
            return;
          }

          if (sectionId === "priceMin") {
            pendingPriceRef.current.min =
              typeof value === "string" && value ? parseNumberParam(value) : null;
            commitPendingPriceToUrl();
            return;
          }

          if (sectionId === "priceMax") {
            pendingPriceRef.current.max =
              typeof value === "string" && value ? parseNumberParam(value) : null;
            commitPendingPriceToUrl();
            return;
          }

          if (sectionId === "sort") {
            const allowed = new Set(["default", "price-asc", "price-desc", "name-asc"]);
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            replaceUrlParams({ sort: next }, { resetPage: true });
          }
        }}
        onClear={clearFilters}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
        hideInline
      />
    </div>
  );
}
