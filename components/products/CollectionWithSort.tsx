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

  const sortedProducts = useMemo(() => {
    const arr = [...products];
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
        return arr;
    }
  }, [products, sort]);

  return (
    <div>
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
      <ProductGrid products={sortedProducts} />
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
