import { getProducts } from "@/lib/supabase/products";
import { getCategoryDisplayName } from "@/lib/collection-utils";
import CollectionWithSort from "@/components/products/CollectionWithSort";
import type { Metadata } from "next";

interface CollectionPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { category } = await params;
  const displayNames: Record<string, string> = {
    sofa: "Sofas & Sectionals",
    bed: "Beds & Bedroom",
    table: "Dining & Tables",
    chair: "Chairs & Recliners",
    cabinet: "Dressers & Cabinets",
    "tv-stand": "TV Stands & Entertainment",
  };
  const name = displayNames[category] || category;
  return {
    title: name,
    description: `Shop our ${name} collection at Amazing Home Furniture. Premium pieces with free shipping over $299.`,
    openGraph: {
      title: `${name} | Amazing Home Furniture`,
      url: `https://amazinghomefurniturestore.com/collections/${category}`,
    },
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/collections/${category}`,
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { category } = await params;
  const products = await getProducts(category);
  const categoryLabel = getCategoryDisplayName(category);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div className="h-20 bg-[#1C1C1C] flex items-center justify-center">
        <h1 className="font-serif text-xl md:text-2xl font-semibold text-white">
          {categoryLabel}
        </h1>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="mb-8 text-sm text-warm-gray">
          {products.length} products
        </p>
        <CollectionWithSort products={products} />
      </div>
    </div>
  );
}
