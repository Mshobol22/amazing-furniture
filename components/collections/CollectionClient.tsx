"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ProductGrid from "@/components/products/ProductGrid";
import CollectionSidebar from "@/components/collections/CollectionSidebar";
import Pagination from "@/components/brands/Pagination";
import type { Product } from "@/types";
import type { SubcategoryCount } from "@/lib/supabase/products";

interface CollectionClientProps {
  slug: string;
  initialProducts: Product[];
  initialTotal: number;
  availableSubcategories: SubcategoryCount[];
  categoryCounts?: { slug: string; name: string; count: number }[];
  allBrands?: { name: string; count: number }[];
}

const BASE_SORT_OPTIONS = [
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "name-asc", label: "Name: A to Z" },
];

const LIMIT = 24;

function parseArr(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

export default function CollectionClient({
  slug,
  initialProducts,
  initialTotal,
  availableSubcategories,
  categoryCounts = [],
  allBrands = [],
}: CollectionClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isInitialMount = useRef(true);

  const isAll = slug === "all";

  const collectionManufacturerFilter = useMemo(() => {
    if (isAll) {
      const raw = searchParams.get("manufacturer");
      return raw?.split(",").map((s) => s.trim()).filter(Boolean)[0];
    }
    const raw = searchParams.get("manufacturers");
    return raw?.split(",").map((s) => s.trim()).filter(Boolean)[0];
  }, [isAll, searchParams]);

  const collectionCategorySlugForGrid = isAll ? undefined : slug;
  const sortOptions = isAll
    ? [...BASE_SORT_OPTIONS, { value: "created-desc", label: "Newest Arrivals" }]
    : BASE_SORT_OPTIONS;
  const sort = searchParams.get("sort") || "price-desc";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const totalPages = Math.ceil(total / LIMIT);
  const start = (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);

  const activeFilterCount =
    (isAll
      ? parseArr(searchParams.get("category")).length +
        parseArr(searchParams.get("manufacturer")).length +
        (searchParams.get("minPrice") ? 1 : 0) +
        (searchParams.get("maxPrice") ? 1 : 0)
      : parseArr(searchParams.get("type")).length +
        parseArr(searchParams.get("manufacturers")).length +
        parseArr(searchParams.get("colors")).length +
        (searchParams.get("priceMin") ? 1 : 0) +
        (searchParams.get("priceMax") ? 1 : 0));

  // ── Fetch products whenever URL changes ──────────────────────────────────

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(LIMIT));
    setLoading(true);
    fetch(`/api/collections/${slug}/products?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        setProducts(data.products);
        setTotal(data.total);
      })
      .catch((err) => console.error("Failed to fetch collection products:", err))
      .finally(() => setLoading(false));
  }, [searchParams, slug]);

  // ── Sort ─────────────────────────────────────────────────────────────────

  const handleSortChange = (newSort: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page");
    p.set("sort", newSort);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ── Pagination ───────────────────────────────────────────────────────────

  const handlePageChange = (newPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    if (newPage === 1) p.delete("page");
    else p.set("page", String(newPage));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        <CollectionSidebar
          slug={slug}
          availableSubcategories={availableSubcategories}
          categoryCounts={categoryCounts}
          allBrands={allBrands}
        />
      </aside>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 w-[300px] max-w-full overflow-y-auto bg-[#FAF8F5] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-lg font-semibold text-[#1C1C1C]">
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
              availableSubcategories={availableSubcategories}
              categoryCounts={categoryCounts}
              allBrands={allBrands}
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
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
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
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
          >
            {sortOptions.map((opt) => (
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
          <ProductGrid
            products={products}
            collectionCategorySlug={collectionCategorySlugForGrid}
            collectionManufacturerFilter={collectionManufacturerFilter}
            enableContextualReel
          />
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
