import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getManufacturerBySlug,
  getProductsByManufacturer,
  getManufacturerCategories,
} from "@/lib/supabase/products";
import BrandProductGrid from "@/components/brands/BrandProductGrid";
import BrandNotifyForm from "@/components/brands/BrandNotifyForm";

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

  // Active brand — fetch products and categories
  const [{ products, total: totalCount }, categories] = await Promise.all([
    getProductsByManufacturer(manufacturer.name, "all", 24, 0),
    getManufacturerCategories(manufacturer.name),
  ]);

  const isZinatex = manufacturer.slug === "zinatex";

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero banner */}
      <div
        className={`flex flex-col items-center justify-center px-4 py-12 text-center ${
          isZinatex
            ? "bg-[#2D4A3E]"
            : "bg-[#1C1C1C]"
        }`}
      >
        <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
          {isZinatex ? "Luxury Rugs & Floor Coverings" : manufacturer.name}
        </h1>
        {manufacturer.description && (
          <p className="mt-3 max-w-lg text-sm text-white/70">
            {manufacturer.description}
          </p>
        )}
        <p className="mt-2 text-xs text-white/50">
          {totalCount} product{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Product grid */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <BrandProductGrid
          products={products}
          categories={categories}
          totalCount={totalCount}
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
