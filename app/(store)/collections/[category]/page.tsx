import { getProducts } from "@/lib/supabase/products";
import ProductGrid from "@/components/products/ProductGrid";

interface CollectionPageProps {
  params: Promise<{ category: string }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { category } = await params;
  const products = await getProducts(category);

  const categoryLabel =
    category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ");

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          {categoryLabel}
        </h1>
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
