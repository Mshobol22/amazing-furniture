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
    <div className="min-h-screen noise-overlay page-collection bg-cream">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-2 font-display text-3xl font-semibold text-charcoal">
            Shop All Furniture
          </h1>
          <p className="mb-8 text-sm text-warm-gray">
            {totalCount} products across {CATEGORY_COUNT} categories
          </p>
          <ShopAllContent products={products} />
        </div>
      </div>
    </div>
  );
}
