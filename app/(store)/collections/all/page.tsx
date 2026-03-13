import { getProducts } from "@/lib/supabase/products";
import { getTotalProductCount } from "@/lib/supabase/products";
import ShopAllContent from "@/components/shop/ShopAllContent";
import type { Metadata } from "next";

const CATEGORY_COUNT = 6;

export const metadata: Metadata = {
  title: "Shop All Furniture",
  description:
    "Shop 291 premium furniture pieces across sofas, beds, chairs, cabinets, tables and TV stands. Free shipping over $299.",
  openGraph: {
    title: "Shop All Furniture | Amazing Home Furniture",
    url: "https://amazinghomefurniturestore.com/collections/all",
  },
  alternates: {
    canonical: "https://amazinghomefurniturestore.com/collections/all",
  },
};

export default async function ShopAllPage() {
  const [products, totalCount] = await Promise.all([
    getProducts("all"),
    getTotalProductCount(),
  ]);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div className="h-20 bg-[#1C1C1C] flex items-center justify-center">
        <h1 className="font-serif text-xl md:text-2xl font-semibold text-white">
          Shop All Furniture
        </h1>
      </div>
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-sm text-warm-gray">
            {totalCount} products across {CATEGORY_COUNT} categories
          </p>
          <ShopAllContent products={products} />
        </div>
      </div>
    </div>
  );
}
