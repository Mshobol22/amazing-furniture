"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ProductGrid from "@/components/products/ProductGrid";
import CollectionSidebar, {
  type CollectionFilters,
} from "@/components/collections/CollectionSidebar";
import Pagination from "@/components/brands/Pagination";
import type { Product } from "@/types";
import type { ManufacturerCount, SubcategoryCount } from "@/lib/supabase/products";

interface CollectionClientProps {
  slug: string;
  initialProducts: Product[];
  initialTotal: number;
  manufacturerCounts: ManufacturerCount[];
  availableCollections: string[];
  availableColors: string[];
  availableSizes: string[];
  availableSubcategories: SubcategoryCount[];
}

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

const LIMIT = 24;

function parseArray(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

function filtersFromParams(params: URLSearchParams): CollectionFilters {
  return {
    types: parseArray(params.get("type")),
    manufacturers: parseArray(params.get("manufacturers")),
    collections: parseArray(params.get("collections")),
    colors: parseArray(params.get("colors")),
    sizes: parseArray(params.get("sizes")),
    inStockOnly: params.get("inStock") === "true",
    priceMin: params.get("priceMin") || "",
    priceMax: params.get("priceMax") || "",
    sort: params.get("sort") || "name-asc",
  };
}

function buildSearchParams(
  filters: CollectionFilters,
  page: number
): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.types.length > 0) p.set("type", filters.types.join(","));
  if (filters.manufacturers.length > 0)
    p.set("manufacturers", filters.manufacturers.join(","));
  if (filters.collections.length > 0)
    p.set("collections", filters.collections.join(","));
  if (filters.colors.length > 0) p.set("colors", filters.colors.join(","));
  if (filters.sizes.length > 0) p.set("sizes", filters.sizes.join(","));
  if (filters.inStockOnly) p.set("inStock", "true");
  if (filters.priceMin) p.set("priceMin", filters.priceMin);
  if (filters.priceMax) p.set("priceMax", filters.priceMax);
  if (filters.sort && filters.sort !== "name-asc") p.set("sort", filters.sort);
  if (page > 1) p.set("page", String(page));
  return p;
}

export default function CollectionClient({
  slug,
  initialProducts,
  initialTotal,
  manufacturerCounts,
  availableCollections,
  availableColors,
  availableSizes,
  availableSubcategories,
}: CollectionClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<CollectionFilters>(() =>
    filtersFromParams(searchParams)
  );
  const [page, setPage] = useState(() =>
    Math.max(1, Number(searchParams.get("page") || "1"))
  );

  const totalPages = Math.ceil(total / LIMIT);
  const isInitialMount = useRef(true);

  const fetchProducts = useCallback(
    async (f: CollectionFilters, p: number) => {
      setLoading(true);
      try {
        const params = buildSearchParams(f, p);
        params.set("page", String(p));
        params.set("limit", String(LIMIT));
        const res = await fetch(
          `/api/collections/${slug}/products?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch collection products:", err);
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = buildSearchParams(filters, page);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    fetchProducts(filters, page);
  }, [filters, page, router, pathname, fetchProducts]);

  const handleFiltersChange = (newFilters: CollectionFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFilterCount =
    filters.types.length +
    filters.manufacturers.length +
    filters.collections.length +
    filters.colors.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  const start = (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);

  return (
    <div className="flex gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        <CollectionSidebar
          slug={slug}
          manufacturerCounts={manufacturerCounts}
          availableCollections={availableCollections}
          availableColors={availableColors}
          availableSizes={availableSizes}
          availableSubcategories={availableSubcategories}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </aside>

      {/* Mobile filter drawer (z-40 — navbar stays above at z-50) */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 w-[300px] max-w-full overflow-y-auto bg-[#FAF8F5] p-6 shadow-xl">
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
            <CollectionSidebar
              slug={slug}
              manufacturerCounts={manufacturerCounts}
              availableCollections={availableCollections}
              availableColors={availableColors}
              availableSizes={availableSizes}
              availableSubcategories={availableSubcategories}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full rounded-lg bg-[#2D4A3E] py-2.5 text-sm font-medium text-[#FAF8F5] hover:bg-[#3B5E4F]"
            >
              Show {total.toLocaleString()} result{total !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile filter button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#1C1C1C]/15 px-3 py-2 text-sm font-medium text-[#1C1C1C] md:hidden"
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

            {total > 0 && (
              <p className="text-sm text-[#1C1C1C]/60">
                Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
                {total.toLocaleString()} products
              </p>
            )}
          </div>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) =>
              handleFiltersChange({ ...filters, sort: e.target.value })
            }
            className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Product grid */}
        <div
          className={`transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
        >
          <ProductGrid products={products} />
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  );
}
