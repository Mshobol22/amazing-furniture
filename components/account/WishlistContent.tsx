"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/store/wishlistStore";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";

export default function WishlistContent() {
  const items = useWishlistStore((state) => state.items);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    fetch("/api/products/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items }),
    })
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [items]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-2 font-medium text-charcoal">Your wishlist is empty</p>
        <p className="mb-6 text-sm text-warm-gray">
          Save items you love for later.
        </p>
        <Link href="/products">
          <span className="inline-block rounded-md bg-walnut px-4 py-2 text-cream hover:bg-walnut/90">
            Browse Products
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
