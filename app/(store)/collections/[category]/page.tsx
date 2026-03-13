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
    <div className="min-h-screen noise-overlay page-collection px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 font-display text-3xl font-semibold text-charcoal">
          {categoryLabel}
        </h1>
        <p className="mb-8 text-sm text-warm-gray">
          {products.length} products
        </p>
        <CollectionWithSort products={products} />
      </div>
    </div>
  );
}
