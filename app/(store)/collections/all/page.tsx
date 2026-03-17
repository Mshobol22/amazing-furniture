import { getProducts, getTotalProductCount, getManufacturersWithCounts } from "@/lib/supabase/products";
import ShopAllContent from "@/components/shop/ShopAllContent";
import type { Metadata } from "next";

const CATEGORY_COUNT = 7;

export const metadata: Metadata = {
  title: "Shop All Furniture",
  description:
    "Shop premium furniture across sofas, beds, chairs, cabinets, tables, TV stands, and rugs. Free shipping over $299.",
  openGraph: {
    title: "Shop All Furniture | Amazing Home Furniture",
    url: "https://amazinghomefurniturestore.com/collections/all",
  },
  alternates: {
    canonical: "https://amazinghomefurniturestore.com/collections/all",
  },
};

interface ShopAllPageProps {
  searchParams: Promise<{ manufacturer?: string }>;
}

export default async function ShopAllPage({ searchParams }: ShopAllPageProps) {
  const params = await searchParams;
  const requestedManufacturer = params.manufacturer?.trim() ?? null;

  const [products, totalCount, manufacturersList] = await Promise.all([
    getProducts("all"),
    getTotalProductCount(),
    getManufacturersWithCounts(),
  ]);

  // Only allow valid manufacturer names from the DB
  const validManufacturers = manufacturersList
    .filter((m) => !m.comingSoon)
    .map((m) => m.name);

  const initialManufacturer =
    requestedManufacturer && validManufacturers.includes(requestedManufacturer)
      ? requestedManufacturer
      : null;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div className="h-20 bg-[#1C1C1C] flex items-center justify-center">
        <h1 className="font-serif text-xl md:text-2xl font-semibold text-white">
          Shop All Furniture
        </h1>
      </div>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-sm text-warm-gray">
            {totalCount} products across {CATEGORY_COUNT} categories
          </p>
          <ShopAllContent
            products={products}
            initialManufacturer={initialManufacturer}
            manufacturers={validManufacturers}
          />
        </div>
      </div>
    </div>
  );
}
