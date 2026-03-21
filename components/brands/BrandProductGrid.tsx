"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductGrid from "@/components/products/ProductGrid";
import BrandFilterSidebar, {
  type BrandFilters,
} from "@/components/brands/BrandFilterSidebar";
import Pagination from "@/components/brands/Pagination";
import type { Product } from "@/types";
import type { SubcategoryCount } from "@/lib/supabase/products";

interface BrandProductGridProps {
  slug: string;
  initialProducts: Product[];
  initialTotal: number;
  availableCategories: string[];
  availableCollections: string[];
  availableColors: string[];
  availableSizes: string[];
  availableSubcategories: SubcategoryCount[];
  isZinatex: boolean;
}

const SORT_OPTIONS = [
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "name-asc", label: "Name: A to Z" },
];

function parseArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

function filtersFromParams(params: URLSearchParams): BrandFilters {
  return {
    types: parseArrayParam(params.get("type")),
    categories: parseArrayParam(params.get("categories")),
    collections: parseArrayParam(params.get("collections")),
    colors: parseArrayParam(params.get("colors")),
    sizes: parseArrayParam(params.get("sizes")),
    inStockOnly: params.get("inStock") === "true",
    priceMin: params.get("priceMin") || "",
    priceMax: params.get("priceMax") || "",
    sort: params.get("sort") || "price-desc",
  };
}

function filtersToParams(filters: BrandFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.types.length > 0)
    params.set("type", filters.types.join(","));
  if (filters.categories.length > 0)
    params.set("categories", filters.categories.join(","));
  if (filters.collections.length > 0)
    params.set("collections", filters.collections.join(","));
  if (filters.colors.length > 0)
    params.set("colors", filters.colors.join(","));
  if (filters.sizes.length > 0)
    params.set("sizes", filters.sizes.join(","));
  if (filters.inStockOnly) params.set("inStock", "true");
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.sort && filters.sort !== "price-desc")
    params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return params;
}

export default function BrandProductGrid({
  slug,
  initialProducts,
  initialTotal,
  availableCategories,
  availableCollections,
  availableColors,
  availableSizes,
  availableSubcategories,
  isZinatex,
}: BrandProductGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<BrandFilters>(() =>
    filtersFromParams(searchParams)
  );
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get("page") || "1");
    return p >= 1 ? p : 1;
  });

  const totalPages = Math.ceil(total / 24);
  const isInitialMount = useRef(true);

  const fetchProducts = useCallback(
    async (f: BrandFilters, p: number) => {
      setLoading(true);
      try {
        const params = filtersToParams(f, p);
        params.set("page", String(p));
        params.set("limit", "24");
        const res = await fetch(`/api/brands/${slug}/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  // Sync URL when filters/page change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = filtersToParams(filters, page);
    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });

    fetchProducts(filters, page);
  }, [filters, page, router, fetchProducts]);

  const handleFiltersChange = (newFilters: BrandFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFilterCount =
    filters.types.length +
    filters.categories.length +
    filters.collections.length +
    filters.colors.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  return (
    <div className="flex gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 lg:block">
        <BrandFilterSidebar
          availableCategories={availableCategories}
          availableCollections={availableCollections}
          availableColors={availableColors}
          availableSizes={availableSizes}
          availableSubcategories={availableSubcategories}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isZinatex={isZinatex}
        />
      </aside>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 top-0 flex justify-end">
            <div className="relative w-[300px] max-w-full overflow-y-auto bg-[#FAF8F5] p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[#1C1C1C]">
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-2xl text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                >
                  &times;
                </button>
              </div>
              <BrandFilterSidebar
                availableCategories={availableCategories}
                availableCollections={availableCollections}
                availableColors={availableColors}
                availableSizes={availableSizes}
                availableSubcategories={availableSubcategories}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isZinatex={isZinatex}
              />
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-6 w-full rounded-lg bg-[#2D4A3E] py-2.5 text-sm font-medium text-[#FAF8F5] hover:bg-[#3B5E4F]"
              >
                Show {total} result{total !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile filter button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#1C1C1C]/15 px-3 py-2 text-sm font-medium text-[#1C1C1C] lg:hidden"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2D4A3E] text-xs text-[#FAF8F5]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <p className="text-sm text-[#1C1C1C]/60">
              {total} product{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Sort dropdown */}
          <select
            value={filters.sort}
            onChange={(e) => handleFiltersChange({ ...filters, sort: e.target.value })}
            className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading overlay */}
        <div className={`transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
          <ProductGrid products={products} />
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
