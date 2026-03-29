"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { extractSku } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import type { Product } from "@/types";
import FilterSidebar, { type ActiveFilters, type FilterSection } from "@/components/filters/FilterSidebar";
import SmartSearchBar from "@/components/filters/SmartSearchBar";
import { formatPrice } from "@/lib/format-price";
import type { AdminFilterStats } from "@/lib/admin/admin-products-data";
import { PAGE_SIZE } from "@/lib/admin/admin-products-catalog-query";

interface ProductsTableProps {
  filterStats: AdminFilterStats;
}

const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_ROWS = 10;

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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <tr key={`sk-${i}`} className="border-b border-gray-100">
          <td className="px-4 py-2">
            <div className="h-10 w-10 rounded bg-gray-200" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 w-16 rounded bg-gray-200" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 w-full max-w-[200px] rounded bg-gray-200" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 w-20 rounded bg-gray-200" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 w-14 rounded bg-gray-200" />
          </td>
          <td className="px-4 py-2">
            <div className="h-6 w-16 rounded-full bg-gray-200" />
          </td>
          <td className="px-4 py-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
          </td>
        </tr>
      ))}
    </>
  );
}

function ProductsTableInner({ filterStats }: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qFromUrl = searchParams.get("q") ?? "";
  const pageFromUrlRaw = searchParams.get("page") ?? "1";
  const manufacturerFromUrl = searchParams.get("manufacturer") ?? "";
  const categoryFromUrl = searchParams.get("category") ?? "";
  const stockFromUrl = searchParams.get("stock") ?? "";
  const sortFromUrl = searchParams.get("sort") ?? "default";

  const pageFromUrl = Math.max(1, parseInt(pageFromUrlRaw, 10) || 1);

  const [searchDraft, setSearchDraft] = useState(qFromUrl);
  useEffect(() => {
    setSearchDraft(qFromUrl);
  }, [qFromUrl]);

  const debouncedSearchForUrl = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSearchForUrl.trim() === qFromUrl.trim()) return;
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (debouncedSearchForUrl.trim()) sp.set("q", debouncedSearchForUrl.trim());
    else sp.delete("q");
    sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [debouncedSearchForUrl, qFromUrl, pathname, router]);

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");

  const fetchKeyRef = useRef(0);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const myKey = ++fetchKeyRef.current;
    const ac = new AbortController();

    const run = async () => {
      setCatalogStatus("loading");
      const params = new URLSearchParams();
      params.set("page", String(pageFromUrl));
      const q = qFromUrl.trim();
      if (q) params.set("q", q);
      if (manufacturerFromUrl) params.set("manufacturer", manufacturerFromUrl);
      if (categoryFromUrl) params.set("category", categoryFromUrl);
      if (stockFromUrl === "in_stock" || stockFromUrl === "out_of_stock") {
        params.set("stock", stockFromUrl);
      }
      if (sortFromUrl !== "default") params.set("sort", sortFromUrl);

      try {
        const r = await fetch(`/api/admin/products/catalog?${params.toString()}`, {
          signal: ac.signal,
        });
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as {
          products?: Product[];
          total?: number;
          page?: number;
        };
        if (fetchKeyRef.current !== myKey) return;
        const rows = data.products ?? [];
        const t = data.total ?? 0;
        const resolvedPage = data.page ?? pageFromUrl;
        setCatalog(rows);
        setTotal(t);
        setCatalogStatus("ready");
        if (resolvedPage !== pageFromUrl) {
          const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
          sp.set("page", String(resolvedPage));
          router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (fetchKeyRef.current !== myKey) return;
        setCatalogStatus("error");
      }
    };

    void run();
    return () => ac.abort();
  }, [
    pageFromUrl,
    qFromUrl,
    manufacturerFromUrl,
    categoryFromUrl,
    stockFromUrl,
    sortFromUrl,
    pathname,
    router,
    retryNonce,
  ]);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const manufacturerCounts = filterStats.manufacturerCounts;
  const stockCounts = filterStats.stockCounts;

  const categoryOptions = useMemo(() => {
    if (manufacturerFromUrl) {
      return filterStats.categoriesByManufacturer[manufacturerFromUrl] ?? filterStats.categoryCounts;
    }
    return filterStats.categoryCounts;
  }, [manufacturerFromUrl, filterStats.categoriesByManufacturer, filterStats.categoryCounts]);

  const manufacturerAllowed = useMemo(
    () => new Set(manufacturerCounts.map((x) => x.value)),
    [manufacturerCounts]
  );

  const categoryAllowed = useMemo(
    () => new Set(categoryOptions.map((c) => c.value)),
    [categoryOptions]
  );

  useEffect(() => {
    if (categoryFromUrl === "bed" || categoryFromUrl === "bedroom-furniture") {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      sp.set("category", "bedroom");
      sp.set("page", "1");
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      return;
    }
    if (!categoryFromUrl) return;
    if (categoryAllowed.has(categoryFromUrl)) return;
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.delete("category");
    sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [categoryFromUrl, categoryAllowed, pathname, router]);

  const patchUrl = useCallback(
    (mutate: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      mutate(sp);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  const handleSidebarChange = useCallback(
    (id: string, value: string | string[] | null) => {
      if (id === "manufacturer") {
        patchUrl((sp) => {
          if (typeof value === "string" && manufacturerAllowed.has(value)) sp.set("manufacturer", value);
          else sp.delete("manufacturer");
          sp.delete("category");
          sp.set("page", "1");
        });
        return;
      }
      if (id === "category") {
        patchUrl((sp) => {
          if (typeof value === "string" && categoryAllowed.has(value)) sp.set("category", value);
          else sp.delete("category");
          sp.set("page", "1");
        });
        return;
      }
      if (id === "stock") {
        patchUrl((sp) => {
          if (value === "in_stock" || value === "out_of_stock") sp.set("stock", value);
          else sp.delete("stock");
          sp.set("page", "1");
        });
        return;
      }
      if (id === "sort") {
        patchUrl((sp) => {
          if (typeof value === "string" && value !== "default") sp.set("sort", value);
          else sp.delete("sort");
          sp.set("page", "1");
        });
      }
    },
    [patchUrl, manufacturerAllowed, categoryAllowed]
  );

  const handleClearAll = useCallback(() => {
    setSearchDraft("");
    patchUrl((sp) => {
      sp.delete("q");
      sp.delete("manufacturer");
      sp.delete("category");
      sp.delete("stock");
      sp.delete("sort");
      sp.set("page", "1");
    });
  }, [patchUrl]);

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
      product.bundle_skus && product.bundle_skus.length > 0 ? [...product.bundle_skus] : [""]
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
        bundle_skus: editingBundleSkus.map((sku) => sku.trim()).filter(Boolean),
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

  const hasFilters = Boolean(
    qFromUrl.trim() ||
      manufacturerFromUrl ||
      categoryFromUrl ||
      stockFromUrl ||
      sortFromUrl !== "default"
  );

  const sections: FilterSection[] = useMemo(
    () => [
      {
        id: "manufacturer",
        label: "Manufacturer",
        type: "checkbox",
        defaultOpen: true,
        options: manufacturerCounts,
      },
      {
        id: "category",
        label: "Category",
        type: "checkbox",
        defaultOpen: true,
        options: categoryOptions.map((c) =>
          c.value === "bedroom" && !c.label
            ? { ...c, label: "Beds & Bedroom Furniture" }
            : c
        ),
      },
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
    ],
    [manufacturerCounts, categoryOptions, stockCounts.inStock, stockCounts.outOfStock]
  );

  const activeSidebar: ActiveFilters = useMemo(
    () => ({
      manufacturer: manufacturerFromUrl || null,
      category: categoryFromUrl || null,
      stock:
        stockFromUrl === "in_stock" || stockFromUrl === "out_of_stock" ? stockFromUrl : null,
      sort: sortFromUrl || "default",
    }),
    [manufacturerFromUrl, categoryFromUrl, stockFromUrl, sortFromUrl]
  );

  const goPage = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages));
    patchUrl((sp) => {
      sp.set("page", String(next));
    });
  };

  const showSkeleton = catalogStatus === "loading";
  const showError = catalogStatus === "error";
  const showEmptyReady = catalogStatus === "ready" && catalog.length === 0;

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
            onClick={handleClearAll}
            className="text-sm text-[#2D4A3E] hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <FilterSidebar
          desktopAsideLayout={{
            asideClassName: "hidden lg:block",
            innerClassName:
              "sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-[#1C1C1C]/10 bg-[#FAF8F5] p-4",
          }}
          sections={sections}
          activeFilters={activeSidebar}
          onChange={handleSidebarChange}
          onClear={handleClearAll}
          mobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
        />

        <div className="space-y-4">
          <SmartSearchBar
            placeholder="Search by name or SKU (partial match)…"
            value={searchDraft}
            onValueChange={setSearchDraft}
            className="mb-0"
          />
          {catalogStatus === "ready" ? (
            <p className="text-sm text-warm-gray">
              {total.toLocaleString()} product{total === 1 ? "" : "s"}
              {qFromUrl.trim() ? ` matching “${qFromUrl.trim()}”` : ""}
              {manufacturerFromUrl || categoryFromUrl || stockFromUrl ? " (filters applied)" : ""}
              {totalPages > 1
                ? ` · Page ${pageFromUrl} of ${totalPages}`
                : ""}
            </p>
          ) : null}
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
                {showError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-warm-gray">
                      Could not load the product catalog.{" "}
                      <button
                        type="button"
                        className="font-medium text-[#2D4A3E] underline hover:no-underline"
                        onClick={() => router.refresh()}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : showSkeleton ? (
                  <TableSkeletonRows />
                ) : showEmptyReady ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-warm-gray">
                      {qFromUrl.trim()
                        ? "No products match this search with the current filters."
                        : "No products match the current filters."}
                    </td>
                  </tr>
                ) : (
                  catalog.map((product, index) => (
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
                              {formatPrice(product.price)}
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
                                  product.in_stock ? "translate-x-5" : "translate-x-0.5"
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
                            <Link href={`/products/${product.slug}`} className="text-walnut hover:underline">
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {expandedProductId === product.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-warm-gray">
                                Description
                              </label>
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
                                      Shared code linking all pieces in a collection (e.g. B396 links B396-K,
                                      B396-D, B396-M)
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
                                          Check this for the product that shows the full room lifestyle image.
                                          This is the parent card shown in browse.
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
                                                setEditingBundleSkus(
                                                  editingBundleSkus.filter((_, i) => i !== idx)
                                                );
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && catalogStatus === "ready" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-warm-gray">
              <span>
                Showing {(pageFromUrl - 1) * PAGE_SIZE + 1}–
                {Math.min(pageFromUrl * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageFromUrl <= 1}
                  onClick={() => goPage(pageFromUrl - 1)}
                  className="rounded border border-gray-200 bg-white px-3 py-1.5 text-charcoal disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pageFromUrl >= totalPages}
                  onClick={() => goPage(pageFromUrl + 1)}
                  className="rounded border border-gray-200 bg-white px-3 py-1.5 text-charcoal disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
