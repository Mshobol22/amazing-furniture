"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ProductResult {
  id: string;
  name: string;
  price: number;
  category: string;
  on_sale: boolean;
  sale_price: number | null;
}

export default function ProductSaleForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [selected, setSelected] = useState<ProductResult | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setSalePrice("");
    setError(null);
    setSuccess(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/promotions/product?q=${encodeURIComponent(val.trim())}`
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelect = (product: ProductResult) => {
    setSelected(product);
    setQuery(product.name);
    setResults([]);
    setSalePrice("");
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    const price = parseFloat(salePrice);
    if (isNaN(price) || price <= 0) {
      setError("Enter a valid sale price");
      return;
    }
    if (price >= selected.price) {
      setError(
        `Sale price must be less than original price ($${selected.price.toLocaleString()})`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/promotions/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: selected.id, sale_price: price }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(
          `Sale applied to "${selected.name}" — $${price.toFixed(2)}`
        );
        setSelected(null);
        setQuery("");
        setSalePrice("");
        router.refresh();
      } else {
        setError(data.error ?? "Failed to apply sale");
      }
    } catch {
      setError("Failed to apply sale");
    } finally {
      setLoading(false);
    }
  };

  const salePriceNum = parseFloat(salePrice);
  const isValidPrice =
    selected != null &&
    isFinite(salePriceNum) &&
    salePriceNum > 0 &&
    salePriceNum < selected.price;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-medium text-charcoal">Product-Specific Sale</h2>
      <p className="mb-4 text-sm text-warm-gray">
        Set a sale price on an individual product.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {/* Product search */}
        <div className="relative">
          <label className="block text-sm text-warm-gray">
            Search Product
          </label>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type product name..."
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
          />
          {searching && (
            <p className="mt-1 text-xs text-warm-gray">Searching...</p>
          )}
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-charcoal">{p.name}</span>
                    <span className="ml-4 shrink-0 text-warm-gray">
                      ${p.price.toLocaleString()}
                      {p.on_sale && p.sale_price != null && (
                        <span className="ml-1 text-xs text-red-500">
                          (on sale: ${p.sale_price})
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sale price — only show once a product is selected */}
        {selected && (
          <div>
            <p className="mb-2 text-sm text-warm-gray">
              Selected:{" "}
              <span className="font-medium text-charcoal">{selected.name}</span>
              {" "}— Original price:{" "}
              <span className="font-medium text-charcoal">
                ${selected.price.toLocaleString()}
              </span>
            </p>
            <label className="block text-sm text-warm-gray">
              Sale Price ($)
            </label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={salePrice}
              onChange={(e) => {
                setSalePrice(e.target.value);
                setError(null);
              }}
              placeholder={`Less than $${selected.price}`}
              className="mt-1 w-40 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
            />
            {salePrice && isValidPrice && (
              <p className="mt-1 text-xs text-green-600">
                {Math.round((1 - salePriceNum / selected.price) * 100)}% off
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || !isValidPrice}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#8B6914" }}
          >
            {loading ? "Saving..." : "Apply Sale"}
          </button>
          {success && (
            <span className="text-sm font-medium text-green-600">{success}</span>
          )}
          {error && (
            <span className="text-sm font-medium text-red-600">{error}</span>
          )}
        </div>
      </form>
    </div>
  );
}
