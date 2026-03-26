import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyAcmePlaceholderImageFilter,
  mapRowToProduct,
  isHiddenAcmePlaceholderProduct,
} from "@/lib/supabase/products";
import {
  parseFiltersFromSearchParams,
  buildSupabaseQuery,
  buildFilterMeta,
} from "@/lib/filters";
import ProductSidebar from "@/components/store/ProductSidebar";
import ActiveFilterChips from "@/components/store/ActiveFilterChips";
import SortDropdown from "@/components/store/SortDropdown";
import MobileFilterBar from "@/components/store/MobileFilterBar";
import ProductGrid from "@/components/products/ProductGrid";

export const metadata: Metadata = {
  title: "Shop All Furniture | Amazing Home Furniture",
  description:
    "Shop thousands of premium furniture pieces — sofas, beds, chairs, tables, cabinets, TV stands, and rugs. Free shipping over $299.",
  alternates: {
    canonical: "https://amazinghomefurniturestore.com/shop",
  },
};

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[]>>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const PAGE_SIZE = 15;
  const rawParams = await searchParams;

  // Flatten string[] → string for URLSearchParams
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const urlParams = new URLSearchParams(flat);
  const page = Math.max(1, Number.parseInt(flat.page ?? "1", 10) || 1);
  const filters = parseFiltersFromSearchParams(urlParams);

  const supabase = createAdminClient();

  // ── Fetch filter metadata (full unfiltered catalogue) ──────────────────
  const { data: rawMeta } = await supabase
    .from("products")
    .select(
      "manufacturer, category, color, material, collection, price, in_stock, on_sale, images"
    )
    .not("images", "is", null)
    .not("images", "eq", "{}");

  const filterMeta = buildFilterMeta(rawMeta ?? []);

  // ── Fetch filtered products (paginated) ────────────────────────────────
  let countQuery = supabase.from("products").select("*", { count: "exact", head: true });
  countQuery = applyAcmePlaceholderImageFilter(countQuery);
  countQuery = buildSupabaseQuery(supabase, countQuery, filters);
  const { count } = await countQuery;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const from = (clampedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let productQuery = supabase.from("products").select("*");
  productQuery = applyAcmePlaceholderImageFilter(productQuery);
  productQuery = buildSupabaseQuery(supabase, productQuery, filters).range(from, to);

  const { data: rawProducts } = await productQuery;
  const products = (rawProducts ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p));

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams(flat);
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    const qs = params.toString();
    return `/shop${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div className="flex h-20 items-center justify-center bg-[#1C1C1C]">
        <h1 className="font-playfair text-3xl font-semibold text-[#FAF8F5] md:text-4xl">
          Shop All Furniture
        </h1>
      </div>

      {/* Mobile filter bar — sticky, md:hidden inside the component */}
      <Suspense fallback={null}>
        <MobileFilterBar filterMeta={filterMeta} total={total} />
      </Suspense>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Desktop sidebar — sticky */}
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-2">
              <Suspense fallback={null}>
                <ProductSidebar filterMeta={filterMeta} />
              </Suspense>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Suspense fallback={null}>
                <ActiveFilterChips />
              </Suspense>
              <Suspense fallback={null}>
                <SortDropdown />
              </Suspense>
            </div>

            <p className="mb-4 text-sm text-[#1C1C1C]/60">
              Showing {total === 0 ? 0 : from + 1}-{Math.min(from + PAGE_SIZE, total)} of{" "}
              {total.toLocaleString()} product{total !== 1 ? "s" : ""}
            </p>

            <ProductGrid products={products} />
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                {clampedPage > 1 && (
                  <Link
                    href={pageHref(clampedPage - 1)}
                    className="rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#FAF8F5]"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="text-sm text-[#6B6560]">
                  Page {clampedPage} of {totalPages}
                </span>
                {clampedPage < totalPages && (
                  <Link
                    href={pageHref(clampedPage + 1)}
                    className="rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#FAF8F5]"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
