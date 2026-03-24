import { searchProducts } from "@/lib/supabase/products";
import ProductGrid from "@/components/products/ProductGrid";
import ShopAllFurnitureClient from "@/components/collections/ShopAllFurnitureClient";

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const search = params.search;

  if (search) {
    const products = await searchProducts(search);
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
            Search: &quot;{search}&quot;
          </h1>
          <ProductGrid products={products} />
        </div>
      </div>
    );
  }

  return <ShopAllFurnitureClient />;
}
