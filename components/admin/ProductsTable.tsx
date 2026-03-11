"use client";

import { useState } from "react";
import Link from "next/link";
import { extractSku } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import type { Product } from "@/types";

const CATEGORIES = ["bed", "chair", "sofa", "table", "cabinet", "tv-stand"];

interface ProductsTableProps {
  products: Product[];
}

export default function ProductsTable({ products }: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");

  const filtered = products.filter((p) => {
    const sku = extractSku(p.slug) ?? "";
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleToggleStock = async (product: Product) => {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ in_stock: !product.in_stock }),
    });
    if (res.ok) window.location.reload();
  };

  const handlePriceSave = async (product: Product) => {
    const val = parseFloat(editingPriceValue);
    if (isNaN(val) || val < 0) {
      setEditingPriceId(null);
      return;
    }
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: val }),
    });
    if (res.ok) window.location.reload();
    setEditingPriceId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm w-64"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Thumbnail
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                SKU
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Category
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Price
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                In Stock
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr
                key={product.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2">
                  <div className="relative h-10 w-10 overflow-hidden rounded bg-gray-100 shrink-0">
                    <ProductImage
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-contain"
                      sizes="40px"
                    />
                  </div>
                </td>
                <td className="px-4 py-2 text-warm-gray">
                  {extractSku(product.slug) ?? "—"}
                </td>
                <td className="px-4 py-2 font-medium text-charcoal">
                  {product.name}
                </td>
                <td className="px-4 py-2 text-warm-gray">{product.category}</td>
                <td className="px-4 py-2">
                  {editingPriceId === product.id ? (
                    <input
                      type="number"
                      value={editingPriceValue}
                      onChange={(e) => setEditingPriceValue(e.target.value)}
                      onBlur={() => handlePriceSave(product)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePriceSave(product);
                        if (e.key === "Escape") setEditingPriceId(null);
                      }}
                      autoFocus
                      className="w-20 rounded border px-2 py-1 text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPriceId(product.id);
                        setEditingPriceValue(String(product.price));
                      }}
                      className="text-charcoal hover:underline"
                    >
                      ${product.price.toLocaleString()}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: product.in_stock ? "#22c55e" : "#ef4444",
                      }}
                      aria-hidden
                    />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.in_stock}
                      onClick={() => handleToggleStock(product)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-walnut focus:ring-offset-2 ${
                        product.in_stock ? "bg-green-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                          product.in_stock ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="text-walnut hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
