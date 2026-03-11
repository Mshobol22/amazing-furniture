import { getProducts } from "@/lib/supabase/products";
import { getCategoryDisplayName } from "@/lib/collection-utils";
import CollectionWithSort from "@/components/products/CollectionWithSort";

interface CollectionPageProps {
  params: Promise<{ category: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { category } = await params;
  const products = await getProducts(category);
  const categoryLabel = getCategoryDisplayName(category);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
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
