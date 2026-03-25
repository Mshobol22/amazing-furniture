"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { Pencil, Check, X } from "lucide-react";
import { extractSku } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import type { Product } from "@/types";
import FilterSidebar, { type ActiveFilters, type FilterSection } from "@/components/filters/FilterSidebar";
import SmartSearchBar from "@/components/filters/SmartSearchBar";

interface ProductsTableProps {
  products: Product[];
}

const PIECE_TYPE_OPTIONS = [
  "King Bed",
  "Queen Bed",
  "Full Bed",
  "Twin Bed",
  "Dresser",
  "Mirror",
  "Chest",
  "Nightstand",
  "Sofa",
  "Loveseat",
  "Recliner",
  "Coffee Table",
  "End Table",
  "TV Stand",
  "Bookcase",
  "Bunk Bed",
  "Other",
];

function ProductsTableInner({ products }: ProductsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [manufacturer, setManufacturer] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [stock, setStock] = useState<string | null>(null);
  const [sort, setSort] = useState<string>("default");

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [savedNameId, setSavedNameId] = useState<string | null>(null);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingCollectionGroup, setEditingCollectionGroup] = useState("");
  const [editingPieceType, setEditingPieceType] = useState("");
  const [editingIsCollectionHero, setEditingIsCollectionHero] = useState(false);
  const [editingBundleSkus, setEditingBundleSkus] = useState<string[]>([""]);
  const [savingDescriptionId, setSavingDescriptionId] = useState<string | null>(null);

  const getDisplayName = (p: Product) => nameOverrides[p.id] ?? p.name;

  const manufacturerCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const name = p.manufacturer ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [products]);

  const categoryCounts = React.useMemo(() => {
    const source = manufacturer
      ? products.filter((p) => (p.manufacturer ?? "Unknown") === manufacturer)
      : [];
    const map = new Map<string, number>();
    for (const p of source) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [manufacturer, products]);

  const stockCounts = React.useMemo(() => {
    let inStock = 0;
    let outOfStock = 0;
    for (const p of products) {
      if (p.in_stock) inStock += 1;
      else outOfStock += 1;
    }
    return { inStock, outOfStock };
  }, [products]);

  const filteredBase = products.filter((p) => {
    const sku = extractSku(p.slug) ?? "";
    const displayName = getDisplayName(p);
    const query = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      displayName.toLowerCase().includes(query) ||
      sku.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query) ||
      (p.manufacturer ?? "").toLowerCase().includes(query);
    const matchCategory = !category || p.category === category;
    const matchManufacturer = !manufacturer || (p.manufacturer ?? "Unknown") === manufacturer;
    const matchStatus =
      !stock ||
      (stock === "in_stock" && p.in_stock) ||
      (stock === "out_of_stock" && !p.in_stock);
    return matchSearch && matchCategory && matchManufacturer && matchStatus;
  });

  const filtered = React.useMemo(() => {
    const list = [...filteredBase];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "newest") list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return list;
  }, [filteredBase, sort]);

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
    setEditingCollectionGroup(product.collection_group ?? "");
    setEditingPieceType(product.piece_type ?? "");
    setEditingIsCollectionHero(Boolean(product.is_collection_hero));
    setEditingBundleSkus(
      product.bundle_skus && product.bundle_skus.length > 0
        ? [...product.bundle_skus]
        : [""]
    );
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
      body: JSON.stringify({
        description: editingDescription,
        collection_group: editingCollectionGroup.trim(),
        piece_type: editingPieceType,
        is_collection_hero: editingIsCollectionHero,
        bundle_skus: editingBundleSkus
          .map((sku) => sku.trim())
          .filter(Boolean),
      }),
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

  const hasFilters = Boolean(searchQuery || manufacturer || category || stock || sort !== "default");
  const sections: FilterSection[] = [
    {
      id: "manufacturer",
      label: "Manufacturer",
      type: "checkbox",
      defaultOpen: true,
      options: manufacturerCounts,
    },
    ...(manufacturer
      ? [{
          id: "category",
          label: "Category",
          type: "checkbox" as const,
          defaultOpen: true,
          options: categoryCounts,
        }]
      : []),
    {
      id: "stock",
      label: "Stock",
      type: "checkbox",
      defaultOpen: true,
      options: [
        { value: "in_stock", label: "In Stock", count: stockCounts.inStock },
        { value: "out_of_stock", label: "Out of Stock", count: stockCounts.outOfStock },
      ],
    },
    {
      id: "sort",
      label: "Sort By",
      type: "sort",
      defaultOpen: true,
      options: [
        { value: "default", label: "Default", count: 0 },
        { value: "price-asc", label: "Price: Low to High", count: 0 },
        { value: "price-desc", label: "Price: High to Low", count: 0 },
        { value: "name-asc", label: "A to Z", count: 0 },
        { value: "newest", label: "Newest First", count: 0 },
      ],
    },
  ];

  const activeSidebar: ActiveFilters = { manufacturer, category, stock, sort };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm font-medium"
          onClick={() => setMobileFiltersOpen(true)}
        >
          Filters
        </button>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setManufacturer(null);
              setCategory(null);
              setStock(null);
              setSort("default");
            }}
            className="text-sm text-[#2D4A3E] hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-[#1C1C1C]/10 bg-[#FAF8F5] p-4">
            <FilterSidebar
              sections={sections}
              activeFilters={activeSidebar}
              onChange={(id, value) => {
                if (id === "manufacturer") {
                  const allowed = new Set(manufacturerCounts.map((x) => x.value));
                  const next = typeof value === "string" && allowed.has(value) ? value : null;
                  setManufacturer(next);
                  setCategory(null);
                  return;
                }
                if (id === "category") {
                  const allowed = new Set(categoryCounts.map((x) => x.value));
                  setCategory(typeof value === "string" && allowed.has(value) ? value : null);
                  return;
                }
                if (id === "stock") {
                  if (value === "in_stock" || value === "out_of_stock") setStock(value);
                  else setStock(null);
                  return;
                }
                if (id === "sort") setSort(typeof value === "string" ? value : "default");
              }}
              onClear={() => {
                setSearchQuery("");
                setManufacturer(null);
                setCategory(null);
                setStock(null);
                setSort("default");
              }}
            />
          </div>
        </aside>

        <div className="space-y-4">
          <SmartSearchBar
            placeholder="Search by name, SKU, slug, or manufacturer..."
            onSearch={setSearchQuery}
            className="mb-0"
          />
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[700px] font-sans text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                Thumbnail
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                SKU
              </th>
              <th className="min-w-0 flex-1 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                Name
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                Category
              </th>
              <th className="w-[90px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                Price
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
                Stock
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal">
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
                      manufacturer={product.manufacturer}
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
                      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-charcoal">Collection Settings</h3>
                        <div className="mt-3 space-y-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-warm-gray">
                              Collection Group Code
                            </label>
                            <input
                              type="text"
                              value={editingCollectionGroup}
                              onChange={(e) => setEditingCollectionGroup(e.target.value)}
                              placeholder="e.g. B396"
                              className="w-full rounded border border-gray-200 bg-cream px-3 py-2 text-sm focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
                            />
                            <p className="mt-1 text-xs text-warm-gray">
                              Shared code linking all pieces in a collection (e.g. B396 links B396-K, B396-D, B396-M)
                            </p>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-warm-gray">
                              Piece Type
                            </label>
                            <select
                              value={editingPieceType}
                              onChange={(e) => setEditingPieceType(e.target.value)}
                              className="w-full rounded border border-gray-200 bg-cream px-3 py-2 text-sm focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
                            >
                              <option value="">Not set</option>
                              {PIECE_TYPE_OPTIONS.map((piece) => (
                                <option key={piece} value={piece}>
                                  {piece}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="flex items-start gap-2 text-sm text-charcoal">
                              <input
                                type="checkbox"
                                checked={editingIsCollectionHero}
                                onChange={(e) => setEditingIsCollectionHero(e.target.checked)}
                                className="mt-0.5"
                              />
                              <span>
                                Collection Hero
                                <span className="mt-1 block text-xs text-warm-gray">
                                  Check this for the product that shows the full room lifestyle image. This is the parent card shown in browse.
                                </span>
                              </span>
                            </label>
                          </div>

                          {editingIsCollectionHero ? (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-warm-gray">
                                Bundle SKUs (pieces in this collection)
                              </label>
                              <div className="space-y-2">
                                {editingBundleSkus.map((sku, idx) => (
                                  <div key={`${idx}-${sku}`} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={sku}
                                      onChange={(e) => {
                                        const next = [...editingBundleSkus];
                                        next[idx] = e.target.value;
                                        setEditingBundleSkus(next);
                                      }}
                                      placeholder="e.g. B396-D"
                                      className="w-full rounded border border-gray-200 bg-cream px-3 py-2 text-sm focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editingBundleSkus.length === 1) {
                                          setEditingBundleSkus([""]);
                                          return;
                                        }
                                        setEditingBundleSkus(editingBundleSkus.filter((_, i) => i !== idx));
                                      }}
                                      className="rounded border border-gray-300 px-2 py-1 text-xs text-warm-gray hover:text-charcoal"
                                      aria-label="Remove SKU"
                                    >
                                      X
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingBundleSkus([...editingBundleSkus, ""])}
                                className="mt-2 text-sm font-medium text-[#2D4A3E] hover:underline"
                              >
                                + Add SKU
                              </button>
                              <p className="mt-1 text-xs text-warm-gray">
                                List every individual piece SKU that belongs to this collection.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
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
                            setEditingCollectionGroup(product.collection_group ?? "");
                            setEditingPieceType(product.piece_type ?? "");
                            setEditingIsCollectionHero(Boolean(product.is_collection_hero));
                            setEditingBundleSkus(
                              product.bundle_skus && product.bundle_skus.length > 0
                                ? [...product.bundle_skus]
                                : [""]
                            );
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
      </div>

      <FilterSidebar
        sections={sections}
        activeFilters={activeSidebar}
        onChange={(id, value) => {
          if (id === "manufacturer") {
            const allowed = new Set(manufacturerCounts.map((x) => x.value));
            const next = typeof value === "string" && allowed.has(value) ? value : null;
            setManufacturer(next);
            setCategory(null);
            return;
          }
          if (id === "category") {
            const allowed = new Set(categoryCounts.map((x) => x.value));
            setCategory(typeof value === "string" && allowed.has(value) ? value : null);
            return;
          }
          if (id === "stock") {
            if (value === "in_stock" || value === "out_of_stock") setStock(value);
            else setStock(null);
            return;
          }
          if (id === "sort") setSort(typeof value === "string" ? value : "default");
        }}
        onClear={() => {
          setSearchQuery("");
          setManufacturer(null);
          setCategory(null);
          setStock(null);
          setSort("default");
        }}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
      />
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
