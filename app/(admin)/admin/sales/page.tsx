"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format-price";

type SaleEvent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sale_type: string;
  badge_text: string | null;
  badge_color: string;
  banner_headline: string | null;
  banner_subtext: string | null;
  discount_label: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  sort_order: number;
};

type SearchProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  sale_price: number | null;
  on_sale: boolean | null;
  manufacturer: string | null;
  category: string | null;
  image: string | null;
};

type EventProduct = {
  product_id: string;
  discount_percentage: number | null;
  override_sale_price: number | null;
  product: SearchProduct;
};

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "No dates";
  const start = startDate ? new Date(startDate).toLocaleDateString() : "Any";
  const end = endDate ? new Date(endDate).toLocaleDateString() : "Any";
  return `${start} - ${end}`;
}

function parseDiscountFromLabel(label: string | null): number | null {
  if (!label) return null;
  const match = label.match(/(\d{1,3})\s*%/);
  if (!match) return null;
  const discount = Number(match[1]);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return null;
  return discount;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeHexForPicker(input: string): string {
  const t = input?.trim() || "";
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#2D4A3E";
}

const emptyEventForm = {
  name: "",
  badge_color: "#2D4A3E",
  banner_headline: "",
  discount_label: "",
  start_date: "",
  end_date: "",
  is_active: false,
};

export default function AdminSalesPage() {
  const [events, setEvents] = useState<SaleEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SaleEvent | null>(null);
  const [form, setForm] = useState(emptyEventForm);
  const [savingEvent, setSavingEvent] = useState(false);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [loadingEventProducts, setLoadingEventProducts] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? null,
    [events, activeEventId]
  );

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    const res = await fetch("/api/admin/sale-events", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events ?? []);
      if (activeEventId && !(data.events ?? []).some((event: SaleEvent) => event.id === activeEventId)) {
        setActiveEventId(null);
      }
    }
    setLoadingEvents(false);
  }, [activeEventId]);

  const fetchEventProducts = useCallback(async (eventId: string) => {
    setLoadingEventProducts(true);
    const res = await fetch(`/api/admin/sale-events/${eventId}/products`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setEventProducts(data.products ?? []);
    } else {
      setEventProducts([]);
    }
    setLoadingEventProducts(false);
  }, []);

  const runSearch = useCallback(async (nextQuery: string, nextPage = 1) => {
    if (!activeEventId || nextQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchTotalPages(0);
      setSearchPage(1);
      return;
    }

    setSearchLoading(true);
    const params = new URLSearchParams({
      q: nextQuery.trim(),
      page: String(nextPage),
      limit: "25",
    });
    const res = await fetch(`/api/admin/products/search?${params.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.results ?? []);
      setSearchTotal(data.total ?? 0);
      setSearchPage(data.page ?? nextPage);
      setSearchTotalPages(data.totalPages ?? 0);
      const defaultDiscount = parseDiscountFromLabel(activeEvent?.discount_label ?? null);
      setDiscountInputs((prev) => {
        const next = { ...prev };
        for (const product of data.results ?? []) {
          if (next[product.id] === undefined && defaultDiscount !== null) {
            next[product.id] = String(defaultDiscount);
          }
        }
        return next;
      });
    }
    setSearchLoading(false);
  }, [activeEvent?.discount_label, activeEventId]);

  const debouncedSearch = useCallback(
    (nextQuery: string, nextPage = 1) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void runSearch(nextQuery, nextPage);
      }, 350);
    },
    [runSearch]
  );

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!activeEventId) {
      setEventProducts([]);
      return;
    }
    void fetchEventProducts(activeEventId);
  }, [activeEventId, fetchEventProducts]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  function openCreateModal() {
    setEditingEvent(null);
    setForm(emptyEventForm);
    setShowModal(true);
  }

  function openEditModal(event: SaleEvent) {
    setEditingEvent(event);
    setForm({
      name: event.name,
      badge_color: event.badge_color || "#2D4A3E",
      banner_headline: event.banner_headline ?? "",
      discount_label: event.discount_label ?? "",
      start_date: event.start_date ? event.start_date.slice(0, 10) : "",
      end_date: event.end_date ? event.end_date.slice(0, 10) : "",
      is_active: event.is_active,
    });
    setShowModal(true);
  }

  async function saveEvent() {
    if (!form.name.trim()) {
      window.alert("Event name is required.");
      return;
    }
    if (!form.discount_label?.trim()) {
      window.alert("Nav button — Line 1 is required.");
      return;
    }
    setSavingEvent(true);
    const badgeColor = form.badge_color?.trim() || "#2D4A3E";
    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name),
      sale_type: editingEvent?.sale_type ?? "other",
      badge_text: editingEvent?.badge_text ?? null,
      banner_headline: form.banner_headline?.trim() || null,
      banner_subtext: editingEvent?.banner_subtext ?? null,
      discount_label: form.discount_label.trim(),
      badge_color: badgeColor,
      description: editingEvent?.description ?? null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active,
      sort_order: editingEvent?.sort_order ?? 0,
    };
    const url = editingEvent ? `/api/admin/sale-events/${editingEvent.id}` : "/api/admin/sale-events";
    const method = editingEvent ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowModal(false);
      await fetchEvents();
    }
    setSavingEvent(false);
  }

  async function deleteEvent(eventId: string) {
    const confirmed = window.confirm("Delete this event and remove all assignments?");
    if (!confirmed) return;
    const res = await fetch(`/api/admin/sale-events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      if (activeEventId === eventId) setActiveEventId(null);
      await fetchEvents();
    }
  }

  async function toggleEventActive(event: SaleEvent) {
    const res = await fetch(`/api/admin/sale-events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !event.is_active }),
    });
    if (res.ok) {
      await fetchEvents();
    }
  }

  async function addToSale(product: SearchProduct) {
    if (!activeEvent) return;
    const input = discountInputs[product.id] ?? "";
    const discount = Number(input);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      window.alert("Discount must be between 0 and 100.");
      return;
    }
    setUpdatingProductId(product.id);
    const res = await fetch(`/api/admin/sale-events/${activeEvent.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id,
        discount_percentage: discount,
      }),
    });
    if (res.ok) {
      await fetchEventProducts(activeEvent.id);
      await runSearch(query, searchPage);
    }
    setUpdatingProductId(null);
  }

  async function removeFromSale(productId: string) {
    if (!activeEvent) return;
    setUpdatingProductId(productId);
    const res = await fetch(
      `/api/admin/sale-events/${activeEvent.id}/products/${productId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await fetchEventProducts(activeEvent.id);
      await runSearch(query, searchPage);
    }
    setUpdatingProductId(null);
  }

  const eventProductIds = useMemo(
    () => new Set(eventProducts.map((item) => item.product_id)),
    [eventProducts]
  );

  const showingFrom = searchTotal === 0 ? 0 : (searchPage - 1) * 25 + 1;
  const showingTo = Math.min(searchPage * 25, searchTotal);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-charcoal">Sales</h1>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B5E4F]"
          >
            <Plus className="h-4 w-4" />
            Create New Event
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {loadingEvents ? (
            <div className="p-6 text-sm text-gray-500">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No sale events yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Date Range</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => setActiveEventId(event.id)}
                    className={`cursor-pointer border-b last:border-b-0 ${
                      activeEventId === event.id ? "bg-[#2D4A3E]/10" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{event.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDateRange(event.start_date, event.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleEventActive(event);
                        }}
                        className={`relative h-6 w-11 rounded-full ${
                          event.is_active ? "bg-[#2D4A3E]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            event.is_active ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(event);
                          }}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteEvent(event.id);
                          }}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeEvent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">
              Adding products to: {activeEvent.name}
            </h2>
            <button
              onClick={() => setActiveEventId(null)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Deselect Event
            </button>
          </div>

          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                setSearchPage(1);
                debouncedSearch(value, 1);
              }}
              placeholder="Search by SKU or product name..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2D4A3E]"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-500" />
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">Thumbnail</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Manufacturer</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Discount %</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((product) => {
                  const inSale = eventProductIds.has(product.id);
                  return (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="h-10 w-10 overflow-hidden rounded bg-gray-100">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">{product.sku ?? "-"}</td>
                      <td className="px-3 py-2">{product.name}</td>
                      <td className="px-3 py-2">{product.manufacturer ?? "-"}</td>
                      <td className="px-3 py-2">{formatPrice(Number(product.price ?? 0))}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={discountInputs[product.id] ?? ""}
                          onChange={(e) =>
                            setDiscountInputs((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {inSale ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                              ✓ In Sale
                            </span>
                            <button
                              onClick={() => void removeFromSale(product.id)}
                              disabled={updatingProductId === product.id}
                              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => void addToSale(product)}
                            disabled={updatingProductId === product.id}
                            className="rounded bg-[#2D4A3E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3B5E4F] disabled:opacity-60"
                          >
                            Add to Sale
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {showingFrom}-{showingTo} of {searchTotal} results
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const next = Math.max(1, searchPage - 1);
                  setSearchPage(next);
                  debouncedSearch(query, next);
                }}
                disabled={searchPage <= 1}
                className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const next = Math.min(searchTotalPages || 1, searchPage + 1);
                  setSearchPage(next);
                  debouncedSearch(query, next);
                }}
                disabled={searchPage >= searchTotalPages}
                className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {activeEvent && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-charcoal">
            Products Currently In This Event
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">Thumbnail</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Discount %</th>
                  <th className="px-3 py-2">Sale Price</th>
                  <th className="px-3 py-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {loadingEventProducts ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-sm text-gray-500">
                      Loading assigned products...
                    </td>
                  </tr>
                ) : eventProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-sm text-gray-500">
                      No products assigned to this event yet.
                    </td>
                  </tr>
                ) : (
                  eventProducts.map((item) => {
                    const basePrice = Number(item.product.price ?? 0);
                    const discount = Number(item.discount_percentage ?? 0);
                    const storedSale =
                      item.override_sale_price != null
                        ? Number(item.override_sale_price)
                        : Number(item.product.sale_price ?? 0);
                    return (
                      <tr key={item.product_id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <div className="h-10 w-10 overflow-hidden rounded bg-gray-100">
                            {item.product.image ? (
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                width={40}
                                height={40}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2">{item.product.sku ?? "-"}</td>
                        <td className="px-3 py-2">{item.product.name}</td>
                        <td className="px-3 py-2">{formatPrice(basePrice)}</td>
                        <td className="px-3 py-2">{discount}%</td>
                        <td className="px-3 py-2">{formatPrice(storedSale)}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => void removeFromSale(item.product_id)}
                            disabled={updatingProductId === item.product_id}
                            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <h3 className="shrink-0 border-b border-gray-100 px-6 py-4 text-lg font-semibold">
              {editingEvent ? "Edit Event" : "Create New Event"}
            </h3>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-charcoal" htmlFor="event_name">
                    Event Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="event_name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="col-span-2 rounded-lg border border-[#2D4A3E]/25 bg-[#FAF8F5] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#2D4A3E]">
                    Storefront nav button
                  </p>
                  <div className="mb-4 space-y-1.5">
                    <label className="text-sm font-medium text-charcoal" htmlFor="discount_label">
                      Nav Button — Line 1 <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="discount_label"
                      required
                      value={form.discount_label}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, discount_label: e.target.value }))
                      }
                      placeholder='e.g. "Up to 40% OFF"'
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Shown large on the nav button. E.g. &quot;Up to 40% OFF&quot;
                    </p>
                  </div>
                  <div className="mb-4 space-y-1.5">
                    <label className="text-sm font-medium text-charcoal" htmlFor="banner_headline">
                      Nav Button — Line 2
                    </label>
                    <input
                      id="banner_headline"
                      value={form.banner_headline}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, banner_headline: e.target.value }))
                      }
                      placeholder='e.g. "Summer Sale — Shop Now"'
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Shown smaller below Line 1. E.g. &quot;Summer Sale — Shop Now&quot;
                    </p>
                  </div>
                  <div className="mb-3 space-y-1.5">
                    <span className="text-sm font-medium text-charcoal">Nav Button Color</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="color"
                        aria-label="Nav button color picker"
                        value={normalizeHexForPicker(form.badge_color)}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, badge_color: e.target.value }))
                        }
                        className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                      />
                      <input
                        type="text"
                        aria-label="Nav button color hex"
                        value={form.badge_color}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, badge_color: e.target.value }))
                        }
                        placeholder="#2D4A3E"
                        className="min-w-[7rem] flex-1 rounded border border-gray-300 px-3 py-2 font-mono text-sm"
                      />
                      <div
                        className="h-10 w-10 shrink-0 rounded border border-gray-200 shadow-inner"
                        style={{
                          backgroundColor: normalizeHexForPicker(form.badge_color),
                        }}
                        title="Live swatch"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Fallback in the store is Forest Green (#2D4A3E) if empty
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-600">Live preview</p>
                    <div
                      className="relative overflow-hidden rounded-lg px-4 py-2.5 text-center text-white shadow-sm transition-[filter] hover:brightness-110"
                      style={{
                        backgroundColor: normalizeHexForPicker(form.badge_color),
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 bg-white opacity-[0.14]"
                        aria-hidden
                      />
                      <div className="relative text-sm font-bold leading-tight">
                        {form.discount_label?.trim() || "Line 1 (discount label)"}
                      </div>
                      <div className="relative mt-0.5 text-xs font-medium text-white/90">
                        {form.banner_headline?.trim() ||
                          form.name?.trim() ||
                          "Line 2 (headline or event name)"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-charcoal" htmlFor="start_date">
                    Start Date
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-charcoal" htmlFor="end_date">
                    End Date
                  </label>
                  <input
                    id="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Is Active <span className="text-red-600">*</span>
                </label>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEvent()}
                disabled={savingEvent}
                className="rounded bg-[#2D4A3E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingEvent ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
