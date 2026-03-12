"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ProductGrid from "./ProductGrid";
import type { Product } from "@/types";
import { getEffectivePrice } from "@/store/cartStore";

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc";

interface CollectionWithSortProps {
  products: Product[];
}

function CollectionWithSortInner({ products }: CollectionWithSortProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sort = (searchParams.get("sort") as SortOption) || "default";
  const filter = searchParams.get("filter") ?? "";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "default") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const filteredAndSortedProducts = useMemo(() => {
    let arr = [...products];
    if (filter) {
      const f = filter.toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(f));
    }
    switch (sort) {
      case "price-asc":
        return arr.sort(
          (a, b) => getEffectivePrice(a) - getEffectivePrice(b)
        );
      case "price-desc":
        return arr.sort(
          (a, b) => getEffectivePrice(b) - getEffectivePrice(a)
        );
      case "name-asc":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      default:
        break;
    }
    return arr;
  }, [products, sort, filter]);

  const categoryLabel = pathname.includes("/bed")
    ? "beds"
    : pathname.includes("/sofa")
      ? "sofas"
      : pathname.includes("/chair")
        ? "chairs"
        : pathname.includes("/table")
          ? "tables"
          : pathname.includes("/cabinet")
            ? "storage"
            : pathname.includes("/tv-stand")
              ? "TV stands"
              : "products";

  return (
    <div>
      {filter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-warm-gray">
            Showing: {filter} {categoryLabel}
          </span>
          <button
            onClick={clearFilter}
            className="rounded-full p-1 text-warm-gray hover:bg-gray-200 hover:text-charcoal"
            aria-label="Clear filter"
          >
            <span className="text-sm font-medium">×</span>
          </button>
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-warm-gray">Sort:</span>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-walnut/50"
        >
          <option value="default">Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A to Z</option>
        </select>
      </div>
      <ProductGrid products={filteredAndSortedProducts} />
    </div>
  );
}

export default function CollectionWithSort(props: CollectionWithSortProps) {
  return (
    <Suspense fallback={<div className="mb-4 h-9 animate-pulse rounded bg-gray-100" />}>
      <CollectionWithSortInner {...props} />
    </Suspense>
  );
}
