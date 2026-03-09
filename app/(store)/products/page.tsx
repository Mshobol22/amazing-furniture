import { getProducts, searchProducts } from "@/lib/supabase/products";
import ProductGrid from "@/components/products/ProductGrid";

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category;
  const search = params.search;

  const products = search
    ? await searchProducts(search)
    : await getProducts(category);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          {search
            ? `Search: "${search}"`
            : category
              ? category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")
              : "All Products"}
        </h1>
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
