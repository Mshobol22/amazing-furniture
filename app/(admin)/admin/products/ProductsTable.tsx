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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-md bg-walnut px-4 py-2 text-sm font-medium text-cream hover:bg-walnut/90"
        >
          Add Product
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Image
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
                  <div className="relative h-12 w-12 overflow-hidden rounded bg-gray-100 shrink-0">
                    <ProductImage
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-contain"
                      sizes="48px"
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
                  <button
                    onClick={() => handleToggleStock(product)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.in_stock
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {product.in_stock ? "Yes" : "No"}
                  </button>
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

      {isAddModalOpen && (
        <AddProductModal onClose={() => setIsAddModalOpen(false)} />
      )}
    </div>
  );
}

function AddProductModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("bed");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        price: parseFloat(price),
        category,
        images: imageUrl ? [imageUrl] : [],
        description: "",
      }),
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-display text-xl font-semibold text-charcoal">
          Add Product
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Slug (optional)
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from name"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Price
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Image URL
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="rounded-md bg-walnut px-4 py-2 text-sm font-medium text-cream hover:bg-walnut/90"
            >
              Add
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
