import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
import { getCategoryDisplayName } from "@/lib/collection-utils";
import ProductSidebar from "@/components/store/ProductSidebar";
import ActiveFilterChips from "@/components/store/ActiveFilterChips";
import SortDropdown from "@/components/store/SortDropdown";
import MobileFilterBar from "@/components/store/MobileFilterBar";
import ProductGrid from "@/components/products/ProductGrid";

const ALLOWED_SLUGS = new Set([
  "bed",
  "bedroom-furniture",
  "sofa",
  "chair",
  "table",
  "cabinet",
  "tv-stand",
  "rug",
  "other",
  "all",
]);

const CATEGORY_BG: Record<string, string> = {
  sofa: "#1C3A5E",
  bed: "#2C3E50",
  "bedroom-furniture": "#2D3561",
  chair: "#3D2B1F",
  table: "#1E3A2F",
  cabinet: "#2D2416",
  "tv-stand": "#1A1A2E",
  rug: "#2D4A3E",
  other: "#3A3A3A",
  all: "#1C1C1C",
};

const categoryMeta: Record<string, { title: string; description: string }> = {
  all: {
    title: "All Furniture | Amazing Home Furniture",
    description:
      "Shop thousands of premium furniture pieces — sofas, beds, bedroom furniture, chairs, tables, cabinets, TV stands, rugs, and more. Free shipping over $299.",
  },
  sofa: {
    title: "Sofas & Sectionals | Amazing Home Furniture",
    description:
      "Shop premium sofas and sectionals. Modern, comfortable designs with free shipping over $299.",
  },
  bed: {
    title: "Beds | Amazing Home Furniture",
    description:
      "Shop beds and bed frames. Platform beds, upholstered frames, bunk beds, and more. Free shipping over $299.",
  },
  "bedroom-furniture": {
    title: "Bedroom Furniture | Amazing Home Furniture",
    description:
      "Shop bedroom furniture sets, dressers, nightstands, chests, mirrors, and vanities. Free shipping over $299.",
  },
  chair: {
    title: "Chairs & Recliners | Amazing Home Furniture",
    description:
      "Shop chairs and recliners. Accent chairs, power recliners, and more. Free shipping over $299.",
  },
  table: {
    title: "Dining Tables & Coffee Tables | Amazing Home Furniture",
    description:
      "Shop dining tables and coffee tables. Modern and traditional styles. Free shipping over $299.",
  },
  cabinet: {
    title: "Cabinets & Storage | Amazing Home Furniture",
    description:
      "Shop cabinets and storage solutions. Buffets, bookcases, and media cabinets. Free shipping over $299.",
  },
  "tv-stand": {
    title: "TV Stands & Entertainment Centers | Amazing Home Furniture",
    description:
      "Shop TV stands and entertainment centers. Modern floating and floor-standing designs. Free shipping over $299.",
  },
  rug: {
    title: "Rugs & Floor Coverings | Amazing Home Furniture",
    description:
      "Shop luxury rugs and floor coverings by Zinatex. Area rugs, runners, and more. Free shipping over $299.",
  },
  other: {
    title: "More Furniture | Amazing Home Furniture",
    description:
      "Shop benches, desks, ottomans, and more. Free shipping over $299.",
  },
};

interface CollectionPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { category } = await params;
  const meta = categoryMeta[category] ?? {
    title: `${category} Furniture | Amazing Home Furniture`,
    description: `Shop ${category} furniture with free shipping over $299.`,
  };
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/collections/${category}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://amazinghomefurniturestore.com/collections/${category}`,
      type: "website",
      images: [
        {
          url: "https://amazinghomefurniturestore.com/og-image.png?v=2",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { category } = await params;
  const rawParams = await searchParams;

  if (!ALLOWED_SLUGS.has(category)) notFound();

  const heroBg = CATEGORY_BG[category] ?? "#1C1C1C";
  const categoryLabel =
    category === "all" ? "All Products" : getCategoryDisplayName(category);

  const supabase = createAdminClient();

  // ── Fetch filter metadata scoped to this category ──────────────────────
  let metaQuery = supabase
    .from("products")
    .select(
      "manufacturer, category, color, material, collection, price, in_stock, on_sale, images"
    )
    .not("images", "is", null)
    .not("images", "eq", "{}");

  if (category !== "all") {
    metaQuery = metaQuery.eq("category", category);
  }

  const { data: rawMeta } = await metaQuery;
  const filterMeta = buildFilterMeta(rawMeta ?? []);

  // ── Parse URL filters ──────────────────────────────────────────────────
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const urlParams = new URLSearchParams(flat);
  const filters = parseFiltersFromSearchParams(urlParams);

  // ── Fetch filtered products ────────────────────────────────────────────
  let productQuery = supabase.from("products").select("*");

  if (category !== "all") {
    productQuery = productQuery.eq("category", category);
  }

  productQuery = applyAcmePlaceholderImageFilter(productQuery);
  productQuery = buildSupabaseQuery(supabase, productQuery, filters);

  const { data: rawProducts } = await productQuery;
  const products = (rawProducts ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p));

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div
        className="flex flex-col items-center justify-center gap-1 py-5"
        style={{ backgroundColor: heroBg }}
      >
        <h1 className="font-display text-xl font-semibold text-[#FAF8F5] md:text-2xl">
          {categoryLabel}
        </h1>
        <p className="text-xs text-[#FAF8F5]/70">
          {filterMeta.length.toLocaleString()} product
          {filterMeta.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Mobile filter bar */}
      <Suspense fallback={null}>
        <MobileFilterBar
          filterMeta={filterMeta}
          total={products.length}
          hideBrand={false}
          hideCategory={category !== "all"}
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
                  hideBrand={false}
                  hideCategory={category !== "all"}
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
