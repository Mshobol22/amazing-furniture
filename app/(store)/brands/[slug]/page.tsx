import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getManufacturerBySlug,
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
import BrandNotifyForm from "@/components/brands/BrandNotifyForm";

const BRAND_BG: Record<string, string> = {
  "nationwide-fd": "#1B3A6B",
  "united-furniture": "#5C3A1E",
  acme: "#2D2D2D",
  zinatex: "#2D4A3E",
};

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const manufacturer = await getManufacturerBySlug(slug);
  if (!manufacturer) {
    return { title: "Brand Not Found | Amazing Home Furniture" };
  }

  return {
    title: `${manufacturer.name} Furniture | Amazing Home Furniture`,
    description: `Shop ${manufacturer.name} at Amazing Home Furniture. ${
      manufacturer.description ?? ""
    } Free shipping on orders over $299.`.trim(),
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/brands/${manufacturer.slug}`,
    },
    openGraph: {
      title: `${manufacturer.name} Furniture | Amazing Home Furniture`,
      description: `Shop ${manufacturer.name} at Amazing Home Furniture. Free shipping on orders over $299.`,
      url: `https://amazinghomefurniturestore.com/brands/${manufacturer.slug}`,
      type: "website",
    },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: BrandPageProps) {
  const { slug } = await params;
  const rawParams = await searchParams;

  const manufacturer = await getManufacturerBySlug(slug);
  if (!manufacturer) notFound();

  const supabase = createAdminClient();

  // ── Fetch filter metadata scoped to this brand ─────────────────────────
  const { data: rawMeta } = await supabase
    .from("products")
    .select(
      "manufacturer, category, color, material, collection, price, in_stock, on_sale, images"
    )
    .eq("manufacturer", manufacturer.name)
    .not("images", "is", null)
    .not("images", "eq", "{}");

  const filterMeta = buildFilterMeta(rawMeta ?? []);

  // No products → coming soon
  if (filterMeta.length === 0) {
    return <ComingSoonBrand manufacturer={manufacturer} />;
  }

  // ── Parse URL filters ──────────────────────────────────────────────────
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const urlParams = new URLSearchParams(flat);
  const filters = parseFiltersFromSearchParams(urlParams);

  // ── Fetch filtered products ────────────────────────────────────────────
  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("manufacturer", manufacturer.name);
  productQuery = applyAcmePlaceholderImageFilter(productQuery);
  productQuery = buildSupabaseQuery(supabase, productQuery, filters);

  const { data: rawProducts } = await productQuery;
  const products = (rawProducts ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p));

  const heroBg = BRAND_BG[slug] ?? "#1C1C1C";
  const isZinatex = slug === "zinatex";

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero banner */}
      <div
        className="flex flex-col items-center justify-center px-4 py-12 text-center"
        style={{ backgroundColor: heroBg }}
      >
        <h1 className="font-display text-3xl font-semibold text-[#FAF8F5] sm:text-4xl">
          {isZinatex ? "Luxury Rugs & Floor Coverings" : manufacturer.name}
        </h1>
        {manufacturer.description && (
          <p className="mt-3 max-w-lg text-sm text-[#FAF8F5]/80">
            {manufacturer.description}
          </p>
        )}
        <p className="mt-2 text-xs text-[#FAF8F5]/60">
          {filterMeta.length.toLocaleString()} product
          {filterMeta.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Mobile filter bar */}
      <Suspense fallback={null}>
        <MobileFilterBar
          filterMeta={filterMeta}
          total={products.length}
          hideBrand
          hideCategory={false}
        />
      </Suspense>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-2">
              <Suspense fallback={null}>
                <ProductSidebar
                  filterMeta={filterMeta}
                  hideBrand
                  hideCategory={false}
                />
              </Suspense>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Suspense fallback={null}>
                <ActiveFilterChips />
              </Suspense>
              <Suspense fallback={null}>
                <SortDropdown />
              </Suspense>
            </div>

            <p className="mb-4 text-sm text-[#1C1C1C]/60">
              {products.length.toLocaleString()} product
              {products.length !== 1 ? "s" : ""}
            </p>

            <ProductGrid products={products} />
          </main>
        </div>
      </div>
    </div>
  );
}

// ── Coming Soon variant ────────────────────────────────────────────────────

function ComingSoonBrand({
  manufacturer,
}: {
  manufacturer: { name: string; description: string | null };
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#FAF8F5] px-4 py-20 text-center">
      <span className="mb-4 rounded-full bg-[#2D4A3E]/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-[#2D4A3E]">
        Coming Soon
      </span>
      <h1 className="font-display text-3xl font-semibold text-[#1C1C1C] sm:text-4xl">
        {manufacturer.name}
      </h1>
      {manufacturer.description && manufacturer.description !== "Coming soon" && (
        <p className="mt-3 max-w-md text-[#6B6560]">{manufacturer.description}</p>
      )}
      <p className="mt-4 max-w-sm text-sm text-[#6B6560]">
        We&apos;re working on bringing {manufacturer.name} products to our store.
        Sign up below to be the first to know when they launch.
      </p>
      <BrandNotifyForm brandName={manufacturer.name} />
    </div>
  );
}
