import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { searchProducts } from "@/lib/supabase/products";
import ProductCard from "@/components/products/ProductCard";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const products = query ? await searchProducts(query) : [];

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Search</span>
        </nav>

        {!query ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <h1 className="mb-2 font-display text-2xl font-semibold text-charcoal">
              Search Products
            </h1>
            <p className="text-warm-gray">
              Enter a search term to find furniture.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <h1 className="mb-2 font-display text-2xl font-semibold text-charcoal">
              No products found for &quot;{query}&quot;
            </h1>
            <p className="mb-6 text-warm-gray">
              Try different keywords or browse our full collection.
            </p>
            <Link
              href="/collections/all"
              className="inline-block rounded-md bg-walnut px-4 py-2 text-cream hover:bg-walnut/90"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-2 font-display text-3xl font-semibold text-charcoal">
              Search results for: {query}
            </h1>
            <p className="mb-8 text-sm text-warm-gray">
              {products.length} product{products.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
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
