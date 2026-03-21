import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getManufacturerBySlug,
  getProductsByManufacturer,
  getManufacturerCategories,
  getManufacturerCollections,
  getManufacturerColors,
  getManufacturerSizes,
  getManufacturerSubcategories,
} from "@/lib/supabase/products";
import BrandProductGrid from "@/components/brands/BrandProductGrid";
import BrandNotifyForm from "@/components/brands/BrandNotifyForm";

const BRAND_BG: Record<string, string> = {
  "nationwide-fd": "#1B3A6B",
  "united-furniture": "#5C3A1E",
  acme: "#2D2D2D",
  zinatex: "#2D4A3E",
};

interface BrandPageProps {
  params: Promise<{ slug: string }>;
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

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const manufacturer = await getManufacturerBySlug(slug);

  if (!manufacturer) {
    notFound();
  }

  // Check if this is a "coming soon" brand (no products)
  const { total } = await getProductsByManufacturer(manufacturer.name, "all", 1, 0);
  const isComingSoon = total === 0;

  if (isComingSoon) {
    return <ComingSoonBrand manufacturer={manufacturer} />;
  }

  const isZinatex = manufacturer.slug === "zinatex";
  const heroBg = BRAND_BG[slug] ?? "#1C1C1C";

  // Fetch initial products + all filter options in parallel
  const [
    { products, total: totalCount },
    categories,
    collections,
    colors,
    sizes,
    subcategories,
  ] = await Promise.all([
    getProductsByManufacturer(manufacturer.name, "all", 24, 0),
    getManufacturerCategories(manufacturer.name),
    getManufacturerCollections(manufacturer.name),
    getManufacturerColors(manufacturer.name),
    isZinatex ? getManufacturerSizes(manufacturer.name) : Promise.resolve([]),
    getManufacturerSubcategories(manufacturer.name),
  ]);

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
          <p className="mt-3 max-w-lg text-sm text-[#FAF8F5]">
            {manufacturer.description}
          </p>
        )}
        <p className="mt-2 text-xs text-[#FAF8F5]">
          {totalCount} product{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Product grid with filters */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <BrandProductGrid
          slug={slug}
          initialProducts={products}
          initialTotal={totalCount}
          availableCategories={categories}
          availableCollections={collections}
          availableColors={colors}
          availableSizes={sizes}
          availableSubcategories={subcategories}
          isZinatex={isZinatex}
        />
      </div>
    </div>
  );
}

// ── Coming Soon variant ───────────────────────────────────────────────────

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
      <h1 className="font-display text-3xl font-semibold text-charcoal sm:text-4xl">
        {manufacturer.name}
      </h1>
      {manufacturer.description && manufacturer.description !== "Coming soon" && (
        <p className="mt-3 max-w-md text-warm-gray">
          {manufacturer.description}
        </p>
      )}
      <p className="mt-4 max-w-sm text-sm text-warm-gray">
        We&apos;re working on bringing {manufacturer.name} products to our store.
        Sign up below to be the first to know when they launch.
      </p>
      <BrandNotifyForm brandName={manufacturer.name} />
    </div>
  );
}
