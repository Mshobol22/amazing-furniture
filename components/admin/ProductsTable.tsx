"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { Pencil, Check, X } from "lucide-react";
import { extractSku } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import type { Product } from "@/types";

const CATEGORIES = ["bed", "chair", "sofa", "table", "cabinet", "tv-stand"];

interface ProductsTableProps {
  products: Product[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function ProductsTableInner({ products }: ProductsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const qFromUrl = searchParams.get("q") ?? "";
  const categoryFromUrl = searchParams.get("category") ?? "all";
  const statusFromUrl = searchParams.get("status") ?? "";
  const promotionsFromUrl = searchParams.get("promotions") ?? "";

  const [searchInput, setSearchInput] = useState(qFromUrl);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  const updateUrl = useCallback(
    (updates: { q?: string; category?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if ("q" in updates) {
        if (updates.q?.trim()) params.set("q", updates.q.trim());
        else params.delete("q");
      }
      if ("category" in updates) {
        if (updates.category && updates.category !== "all")
          params.set("category", updates.category);
        else params.delete("category");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    updateUrl({ q: debouncedSearch });
  }, [debouncedSearch, updateUrl]);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [savedNameId, setSavedNameId] = useState<string | null>(null);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [savingDescriptionId, setSavingDescriptionId] = useState<string | null>(null);

  const getDisplayName = (p: Product) => nameOverrides[p.id] ?? p.name;

  const filtered = products.filter((p) => {
    const sku = extractSku(p.slug) ?? "";
    const displayName = getDisplayName(p);
    const matchSearch =
      !qFromUrl ||
      displayName.toLowerCase().includes(qFromUrl.toLowerCase()) ||
      sku.toLowerCase().includes(qFromUrl.toLowerCase());
    const matchCategory =
      categoryFromUrl === "all" || p.category === categoryFromUrl;
    const matchStatus =
      !statusFromUrl ||
      (statusFromUrl === "in-stock" && p.in_stock) ||
      (statusFromUrl === "out-of-stock" && !p.in_stock);
    const matchPromotions =
      !promotionsFromUrl ||
      (promotionsFromUrl === "active" && p.on_sale);
    return matchSearch && matchCategory && matchStatus && matchPromotions;
  });

  const handleClearFilters = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("category");
    params.delete("status");
    params.delete("promotions");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleNameSave = async (product: Product) => {
    const trimmed = editingNameValue.trim();
    if (!trimmed) return;
    const currentName = nameOverrides[product.id] ?? product.name;
    if (trimmed === currentName) {
      setEditingNameId(null);
      return;
    }
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setNameOverrides((prev) => ({ ...prev, [product.id]: trimmed }));
      setEditingNameId(null);
      setSavedNameId(product.id);
      setTimeout(() => setSavedNameId(null), 2000);
    }
  };

  const handleNameCancel = (product: Product) => {
    const currentName = nameOverrides[product.id] ?? product.name;
    if (editingNameValue.trim() === currentName) {
      setEditingNameId(null);
      return;
    }
    setEditingNameValue(currentName);
    setEditingNameId(null);
  };

  const handleExpandDetails = (product: Product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      return;
    }
    setExpandedProductId(product.id);
    setEditingDescription(product.description ?? "");
  };

  const handleDescriptionSave = async (product: Product) => {
    const currentDesc = product.description ?? "";
    if (editingDescription === currentDesc) {
      setExpandedProductId(null);
      return;
    }
    setSavingDescriptionId(product.id);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editingDescription }),
    });
    setSavingDescriptionId(null);
    if (res.ok) {
      setExpandedProductId(null);
      window.location.reload();
    }
  };

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

  const hasFilters = qFromUrl || (categoryFromUrl && categoryFromUrl !== "all");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64 rounded-md border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={categoryFromUrl}
          onChange={(e) => updateUrl({ category: e.target.value })}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-walnut hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-16 px-4 py-3 text-left font-medium text-charcoal">
                Thumbnail
              </th>
              <th className="w-20 px-4 py-3 text-left font-medium text-charcoal">
                SKU
              </th>
              <th className="min-w-0 flex-1 px-4 py-3 text-left font-medium text-charcoal">
                Name
              </th>
              <th className="w-24 px-4 py-3 text-left font-medium text-charcoal">
                Category
              </th>
              <th className="w-[90px] px-4 py-3 text-left font-medium text-charcoal">
                Price
              </th>
              <th className="w-20 px-4 py-3 text-left font-medium text-charcoal">
                Stock
              </th>
              <th className="w-20 px-4 py-3 text-left font-medium text-charcoal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, index) => (
              <React.Fragment key={product.id}>
              <tr
                className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}
              >
                <td className="px-4 py-2">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
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
                  {editingNameId === product.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleNameSave(product);
                          if (e.key === "Escape") handleNameCancel(product);
                        }}
                        autoFocus
                        className="min-w-[120px] rounded border px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleNameSave(product)}
                        className="text-green-600 hover:text-green-700"
                        aria-label="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleNameCancel(product)}
                        className="text-red-600 hover:text-red-700"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={savedNameId === product.id ? "text-green-600" : ""}>
                        {getDisplayName(product)}
                      </span>
                      {savedNameId === product.id && (
                        <span className="text-xs text-green-600 animate-pulse">Saved</span>
                      )}
                      <button
                        onClick={() => {
                          setEditingNameId(product.id);
                          setEditingNameValue(getDisplayName(product));
                        }}
                        className="text-warm-gray hover:text-charcoal"
                        aria-label="Edit name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.in_stock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.in_stock ? "In Stock" : "Out"}
                    </span>
                    {product.on_sale && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        On Sale
                      </span>
                    )}
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
                          product.in_stock
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExpandDetails(product)}
                      className="text-sm text-walnut hover:underline"
                    >
                      {expandedProductId === product.id ? "Hide Details" : "Edit Details"}
                    </button>
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-walnut hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
              {expandedProductId === product.id && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-4 py-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-warm-gray">Description</label>
                      <textarea
                        rows={4}
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className="w-full rounded border border-gray-200 bg-cream px-3 py-2 text-sm focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDescriptionSave(product)}
                          disabled={savingDescriptionId === product.id}
                          className="rounded bg-walnut px-3 py-1.5 text-sm font-medium text-cream hover:bg-walnut/90 disabled:opacity-50"
                        >
                          {savingDescriptionId === product.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDescription(product.description ?? "");
                            setExpandedProductId(null);
                          }}
                          className="text-sm text-warm-gray hover:text-charcoal"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProductsTable(props: ProductsTableProps) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded bg-gray-100" />}>
      <ProductsTableInner {...props} />
    </Suspense>
  );
}
