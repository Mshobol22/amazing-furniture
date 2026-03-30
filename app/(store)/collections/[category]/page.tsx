import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyStorefrontCollectionCategoryFilter } from "@/lib/collections/collection-scope";
import {
  applyAcmeComponentListingFilter,
  applyAcmePlaceholderImageFilter,
  attachZinatexFromPrices,
  mapRowToProduct,
  isHiddenAcmePlaceholderProduct,
  isHiddenAcmeComponentProduct,
  getCategorySubcategories,
  getMergedBedroomSubcategories,
} from "@/lib/supabase/products";
import { applyZinatexListingVisibilityFilter } from "@/lib/zinatex-listing-filter";
import { getCategoryDisplayName } from "@/lib/collection-utils";
import CollectionClient from "@/components/collections/CollectionClient";

const ALLOWED_SLUGS = new Set([
  "bedroom",
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
  bedroom: "#2D3561",
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
  bedroom: {
    title: "Beds & Bedroom Furniture | Amazing Home Furniture",
    description:
      "Shop beds, bedroom sets, dressers, nightstands, chests, mirrors, vanities, and more. Free shipping over $299.",
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

const LIMIT = 15;

// Sanitizers matching the products route
function sanitizeType(v: string) {
  return v.replace(/[^a-zA-Z0-9 &\-]/g, "").trim();
}
function sanitize(v: string) {
  return v.replace(/[^a-zA-Z0-9 ,.\-]/g, "").trim();
}
function parsePrice(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 99999) return undefined;
  return n;
}

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

  // Flatten multi-value params to single string
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }

  // ── Server-side data ───────────────────────────────────────────────────────

  const supabase = createAdminClient();

  const availableSubcategories =
    category === "bedroom"
      ? await getMergedBedroomSubcategories()
      : await getCategorySubcategories(category);

  // Parse URL filters for SSR initial products (mirrors the products route logic)
  const types = (flat["type"] ?? "")
    .split(",")
    .map(sanitizeType)
    .filter(Boolean);
  const manufacturers = (flat["manufacturers"] ?? "")
    .split(",")
    .map(sanitize)
    .filter(Boolean);
  const colors = (flat["colors"] ?? "")
    .split(",")
    .map(sanitize)
    .filter(Boolean);
  const priceMin = parsePrice(flat["priceMin"]);
  const priceMax = parsePrice(flat["priceMax"]);
  const sort = sanitize(flat["sort"] || "price-desc");
  const page = Math.max(1, Math.min(Number(flat["page"] || "1"), 500));
  const offset = Math.min((page - 1) * LIMIT, 10000);

  let productQuery = supabase
    .from("products")
    .select("*", { count: "exact" });

  productQuery = applyAcmePlaceholderImageFilter(productQuery);
  productQuery = applyZinatexListingVisibilityFilter(productQuery);
  productQuery = applyAcmeComponentListingFilter(productQuery);

  productQuery = applyStorefrontCollectionCategoryFilter(productQuery, category);
  if (types.length > 0) productQuery = productQuery.in("subcategory", types);
  if (manufacturers.length > 0) productQuery = productQuery.in("manufacturer", manufacturers);
  if (colors.length > 0) {
    if (category === "rug") {
      const colorFilter = colors.map((c) => `color.ilike.%${c}%`).join(",");
      productQuery = productQuery.or(colorFilter);
    } else {
      productQuery = productQuery.in("color", colors);
    }
  }
  if (priceMin != null) productQuery = productQuery.gte("price", priceMin);
  if (priceMax != null) productQuery = productQuery.lte("price", priceMax);

  // Show in-stock products first by default on collection pages.
  productQuery = productQuery.order("in_stock", { ascending: false });

  switch (sort) {
    case "price-asc":
      productQuery = productQuery.order("price", { ascending: true });
      break;
    case "created-desc":
      productQuery = productQuery.order("created_at", { ascending: false });
      break;
    case "price-desc":
      productQuery = productQuery.order("price", { ascending: false });
      break;
    default:
      productQuery = productQuery.order("price", { ascending: false });
  }

  productQuery = productQuery.range(offset, offset + LIMIT - 1);

  const { data: rawProducts, count } = await productQuery;
  const mapped = (rawProducts ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  const initialProducts = await attachZinatexFromPrices(mapped);
  const initialTotal = count ?? 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div
        className="flex flex-col items-center justify-center gap-1 py-5"
        style={{ backgroundColor: heroBg }}
      >
        <h1 className="font-playfair text-3xl font-semibold text-[#FAF8F5] md:text-4xl">
          {categoryLabel}
        </h1>
        <p className="font-sans text-sm text-[#FAF8F5]/80">
          {initialTotal.toLocaleString()} product
          {initialTotal !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <CollectionClient
            slug={category}
            initialProducts={initialProducts}
            initialTotal={initialTotal}
            availableSubcategories={availableSubcategories}
          />
        </Suspense>
      </div>
    </div>
  );
}
