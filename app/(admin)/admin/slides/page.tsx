"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Plus, X, Pencil, Trash2, ImageIcon } from "lucide-react";

interface HeroSlide {
  id: string;
  headline: string;
  subheading: string | null;
  cta_label: string;
  cta_href: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  product_slug: string | null;
  product_name: string | null;
}

interface ProductResult {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

const EMPTY_FORM = {
  headline: "",
  subheading: "",
  image_url: "",
  cta_label: "Shop Now",
  cta_href: "/collections/all",
  is_active: true,
  product_slug: "",
  product_name: "",
};

export default function SlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Product search state
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const productSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchSlides = useCallback(async () => {
    const res = await fetch("/api/admin/slides");
    const data = await res.json();
    setSlides(Array.isArray(data) ? data : []);
    setLoading(false);
    setOrderDirty(false);
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // ── Product search ──────────────────────────────────────────────────────────
  const handleProductQueryChange = (q: string) => {
    setProductQuery(q);
    if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
    if (!q.trim()) {
      setProductResults([]);
      setProductSearchOpen(false);
      return;
    }
    productSearchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/slides/search-products?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setProductResults(Array.isArray(data) ? data : []);
        setProductSearchOpen(true);
      }
    }, 300);
  };

  const selectProduct = (p: ProductResult) => {
    setForm((f) => ({
      ...f,
      product_slug: p.slug,
      product_name: p.name,
      cta_href: `/products/${p.slug}`,
    }));
    setProductQuery(p.name);
    setProductResults([]);
    setProductSearchOpen(false);
  };

  const clearProduct = () => {
    setForm((f) => ({ ...f, product_slug: "", product_name: "" }));
    setProductQuery("");
    setProductResults([]);
    setProductSearchOpen(false);
  };

  // ── Form helpers ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setProductQuery("");
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setForm({
      headline: slide.headline,
      subheading: slide.subheading ?? "",
      image_url: slide.image_url,
      cta_label: slide.cta_label,
      cta_href: slide.cta_href,
      is_active: slide.is_active,
      product_slug: slide.product_slug ?? "",
      product_name: slide.product_name ?? "",
    });
    setProductQuery(slide.product_name ?? "");
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setProductQuery("");
    setFormError("");
  };

  // ── Save slide ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.headline.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!form.image_url.trim()) {
      setFormError("Image URL is required.");
      return;
    }

    setFormSaving(true);
    const payload = {
      headline: form.headline.trim(),
      subheading: form.subheading.trim() || null,
      cta_label: form.cta_label.trim() || "Shop Now",
      cta_href: form.cta_href.trim() || "/collections/all",
      image_url: form.image_url.trim(),
      is_active: form.is_active,
      product_slug: form.product_slug.trim() || null,
      product_name: form.product_name.trim() || null,
    };

    const url = editingId ? `/api/admin/slides/${editingId}` : "/api/admin/slides";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setFormSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Something went wrong.");
      return;
    }

    cancelForm();
    await fetchSlides();
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const handleToggleActive = async (slide: HeroSlide) => {
    await fetch(`/api/admin/slides/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !slide.is_active }),
    });
    await fetchSlides();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/slides/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmId(null);
      if (editingId === id) cancelForm();
      await fetchSlides();
    }
  };

  // ── Drag to reorder ─────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    const reordered = [...slides];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    setSlides(reordered);
    dragIndex.current = null;
    setDragOverIndex(null);
    setOrderDirty(true);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  // ── Save order ──────────────────────────────────────────────────────────────
  const handleSaveOrder = async () => {
    setSaving(true);
    const order = slides.map((s, i) => ({ id: s.id, sort_order: i + 1 }));
    await fetch("/api/admin/slides/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    setSaving(false);
    await fetchSlides();
  };

  // ── Image preview helper ────────────────────────────────────────────────────
  const isValidImgUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className=" text-2xl font-semibold text-charcoal">
          Hero Slides
        </h1>
        {!showForm && (
          <Button
            onClick={openCreate}
            className="bg-walnut text-cream hover:bg-walnut/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Slide
          </Button>
        )}
      </div>

      {/* ── Add / Edit Form ─────────────────────────────────────────────────── */}
      {showForm && (
        <section className="mb-10">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className=" text-lg font-semibold text-charcoal">
                {editingId ? "Edit Slide" : "New Slide"}
              </h2>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-md p-1 text-warm-gray hover:bg-gray-100"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Image URL + preview */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image_url">Image URL (required)</Label>
                    <Input
                      id="image_url"
                      value={form.image_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, image_url: e.target.value }))
                      }
                      placeholder="https://images.unsplash.com/..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="headline">Headline (required)</Label>
                    <Input
                      id="headline"
                      value={form.headline}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, headline: e.target.value }))
                      }
                      placeholder="Elevate Your Living Space"
                      maxLength={200}
                      className="mt-1"
                    />
                    <p className="mt-1 text-right text-xs text-warm-gray">
                      {form.headline.length}/200
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="subheading">Subtitle (optional)</Label>
                    <Input
                      id="subheading"
                      value={form.subheading}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, subheading: e.target.value }))
                      }
                      placeholder="Handcrafted furniture for the modern home"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Live image preview */}
                <div>
                  <p className="mb-1 text-sm font-medium text-warm-gray">
                    Image Preview
                  </p>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    {form.image_url && isValidImgUrl(form.image_url) ? (
                      <Image
                        src={form.image_url}
                        alt="Slide preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center gap-2 text-warm-gray">
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-sm">Enter URL to preview</span>
                      </div>
                    )}
                    {form.headline && (
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                        <div>
                          <p className=" text-base font-semibold leading-snug text-white">
                            {form.headline}
                          </p>
                          {form.subheading && (
                            <p className="mt-0.5 text-xs text-white/80">
                              {form.subheading}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cta_label">CTA Button Text</Label>
                  <Input
                    id="cta_label"
                    value={form.cta_label}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cta_label: e.target.value }))
                    }
                    placeholder="Shop Now"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cta_href">CTA Link URL</Label>
                  <Input
                    id="cta_href"
                    value={form.cta_href}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cta_href: e.target.value }))
                    }
                    placeholder="/collections/all"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Product link */}
              <div className="relative">
                <Label htmlFor="product_search">
                  Link to Product (optional)
                </Label>
                {form.product_slug ? (
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                    <span className="flex-1 text-sm font-medium text-charcoal">
                      {form.product_name || form.product_slug}
                    </span>
                    <button
                      type="button"
                      onClick={clearProduct}
                      className="text-warm-gray hover:text-charcoal"
                      aria-label="Clear product"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      id="product_search"
                      value={productQuery}
                      onChange={(e) =>
                        handleProductQueryChange(e.target.value)
                      }
                      onFocus={() =>
                        productResults.length > 0 &&
                        setProductSearchOpen(true)
                      }
                      onBlur={() =>
                        setTimeout(() => setProductSearchOpen(false), 200)
                      }
                      placeholder="Search by product name..."
                      autoComplete="off"
                      className="mt-1"
                    />
                    {productSearchOpen && productResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                        {productResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectProduct(p)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                          >
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
                              {p.image ? (
                                <Image
                                  src={p.image}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="h-full w-full bg-gray-200" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-charcoal">
                                {p.name}
                              </p>
                              <p className="text-xs text-warm-gray">{p.slug}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() =>
                    setForm((f) => ({ ...f, is_active: !f.is_active }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-walnut focus:ring-offset-2 ${
                    form.is_active ? "bg-green-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      form.is_active ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <Label className="cursor-pointer select-none">
                  {form.is_active ? "Active — shown on homepage" : "Inactive — hidden from homepage"}
                </Label>
              </div>

              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={formSaving}
                  className="bg-walnut text-cream hover:bg-walnut/90"
                >
                  {formSaving
                    ? "Saving…"
                    : editingId
                    ? "Update Slide"
                    : "Create Slide"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* ── Slides List ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className=" text-lg font-semibold text-charcoal">
            All Slides
          </h2>
          {orderDirty && (
            <Button
              onClick={handleSaveOrder}
              disabled={saving}
              className="bg-walnut text-cream hover:bg-walnut/90"
            >
              {saving ? "Saving…" : "Save Order"}
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-warm-gray">Loading…</p>
        ) : slides.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-warm-gray">
            No slides yet. Add one above.
          </p>
        ) : (
          <>
            {orderDirty && (
              <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Order changed — click &quot;Save Order&quot; to persist.
              </p>
            )}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 transition-colors ${
                    dragOverIndex === i
                      ? "bg-forest/5 outline outline-2 outline-forest/30"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab touch-none text-gray-400 active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Thumbnail */}
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-gray-100">
                    <Image
                      src={slide.image_url}
                      alt={slide.headline}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">
                      {slide.headline}
                    </p>
                    {slide.subheading && (
                      <p className="truncate text-xs text-warm-gray">
                        {slide.subheading}
                      </p>
                    )}
                    {slide.product_name && (
                      <p className="mt-0.5 text-xs font-medium text-forest">
                        → {slide.product_name}
                      </p>
                    )}
                  </div>

                  {/* Active toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={slide.is_active}
                    onClick={() => handleToggleActive(slide)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-walnut focus:ring-offset-2 ${
                      slide.is_active ? "bg-green-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        slide.is_active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(slide)}
                      aria-label="Edit slide"
                      className="h-8 w-8 p-0 text-warm-gray hover:text-charcoal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {deleteConfirmId === slide.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="h-7 bg-red-600 px-2 text-white hover:bg-red-700"
                          onClick={() => handleDelete(slide.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(slide.id)}
                        aria-label="Delete slide"
                        className="h-8 w-8 p-0 text-warm-gray hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-warm-gray">
              Drag rows to reorder. Click &quot;Save Order&quot; to apply.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
