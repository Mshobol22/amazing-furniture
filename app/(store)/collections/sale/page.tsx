import type { Metadata } from "next";
import Link from "next/link";
import { getSaleProducts } from "@/lib/supabase/products";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "On Sale Now | Amazing Home Furniture",
  description:
    "Shop furniture on sale — sofas, beds, chairs, tables, and more at incredible prices. Free shipping on orders over $299.",
  alternates: {
    canonical: "https://amazinghomefurniturestore.com/collections/sale",
  },
};

export default async function SaleCollectionPage() {
  const products = await getSaleProducts(24);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-[#2D4A3E] py-12 px-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl font-semibold text-white">
            On Sale Now
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Premium furniture at exceptional prices — limited time only.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-2 text-lg font-medium text-[#1C1C1C]">
              No sale items right now — check back soon!
            </p>
            <p className="mb-6 text-sm text-gray-500">
              We regularly update our sale section with new deals.
            </p>
            <Button asChild className="bg-[#2D4A3E] text-white hover:bg-[#1E3329]">
              <Link href="/collections/all">Browse All Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              {products.length} item{products.length !== 1 ? "s" : ""} on sale
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
