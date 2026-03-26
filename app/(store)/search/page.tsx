import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { searchProducts } from "@/lib/supabase/products";
import ProductCard from "@/components/products/ProductCard";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: rawPage } = await searchParams;
  const query = (q ?? "").trim();
  const PAGE_SIZE = 15;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  const allResults = query ? await searchProducts(query) : [];
  const total = allResults.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const products = allResults.slice(start, start + PAGE_SIZE);

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  };

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
            <h1 className="mb-2 text-2xl font-semibold text-charcoal">
              Search Products
            </h1>
            <p className="text-warm-gray">
              Enter a search term to find furniture.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-charcoal">
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
            <h1 className="mb-2 text-3xl font-semibold text-charcoal">
              Search results for: {query}
            </h1>
            <p className="mb-8 text-sm text-warm-gray">
              Showing {start + 1}-{Math.min(start + PAGE_SIZE, total)} of {total} product
              {total !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                {clampedPage > 1 && (
                  <Link
                    href={pageHref(clampedPage - 1)}
                    className="rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#FAF8F5]"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="text-sm text-[#6B6560]">
                  Page {clampedPage} of {totalPages}
                </span>
                {clampedPage < totalPages && (
                  <Link
                    href={pageHref(clampedPage + 1)}
                    className="rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#FAF8F5]"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
