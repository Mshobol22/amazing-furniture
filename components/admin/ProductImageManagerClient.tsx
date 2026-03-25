"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ProductImageManagerRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  manufacturer: string | null;
  images: string[];
};

type Props = {
  products: ProductImageManagerRow[];
  searchQuery: string;
};

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

function sanitizeHttpsUrl(value: string): string {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "";
  if (!lower.startsWith("https://")) return "";
  return trimmed;
}

function ProductThumbnail({ src, alt, size }: { src?: string; alt: string; size: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const className =
    size === "sm"
      ? "relative h-[60px] w-[60px] overflow-hidden rounded bg-gray-100"
      : "relative h-[90px] w-[120px] overflow-hidden rounded bg-gray-100";

  return (
    <div className={className}>
      <Image
        src={!src || failed ? PLACEHOLDER_IMAGE : src}
        alt={alt}
        fill
        className="object-cover"
        sizes={size === "sm" ? "60px" : "120px"}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function ProductImageManagerClient({ products, searchQuery }: Props) {
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [imagesByProductId, setImagesByProductId] = useState<Record<string, string[]>>(
    () =>
      Object.fromEntries(
        products.map((product) => [product.id, Array.isArray(product.images) ? [...product.images] : []])
      )
  );
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState("");
  const [newImageUrlByProductId, setNewImageUrlByProductId] = useState<Record<string, string>>({});
  const [savingByProductId, setSavingByProductId] = useState<Record<string, boolean>>({});
  const [showRevalidationNoteByProductId, setShowRevalidationNoteByProductId] = useState<
    Record<string, boolean>
  >({});

  const results = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        images: imagesByProductId[product.id] ?? [],
      })),
    [imagesByProductId, products]
  );

  const saveImages = async (productId: string, nextImages: string[]) => {
    setSavingByProductId((prev) => ({ ...prev, [productId]: true }));
    try {
      const cleaned = nextImages
        .map((url) => sanitizeHttpsUrl(url))
        .filter((url) => Boolean(url));
      if (cleaned.length === 0) {
        toast({
          title: "Invalid images",
          description: "At least one valid https:// image URL is required.",
          variant: "destructive",
        });
        return false;
      }
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: cleaned,
          images_validated: null,
        }),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        toast({
          title: "Save failed",
          description: error?.error ?? "Could not save image changes.",
          variant: "destructive",
        });
        return false;
      }
      setImagesByProductId((prev) => ({ ...prev, [productId]: cleaned }));
      setShowRevalidationNoteByProductId((prev) => ({ ...prev, [productId]: true }));
      toast({
        title: "Saved",
        description: "Image changes were saved.",
        duration: 2000,
      });
      return true;
    } finally {
      setSavingByProductId((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <form className="rounded-lg border border-gray-200 bg-white p-4" method="get">
        <label htmlFor="query" className="mb-2 block text-sm font-medium text-[#1C1C1C]">
          Search products
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="query"
            name="query"
            defaultValue={searchQuery}
            placeholder="Search by name, SKU, slug, or manufacturer..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#1C1C1C] outline-none transition focus:border-[#2D4A3E] focus:ring-2 focus:ring-[#2D4A3E]/20"
          />
          <button
            type="submit"
            className="rounded-md bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3329]"
          >
            Search
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {results.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No products found for this search.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((product) => {
              const isExpanded = expandedProductId === product.id;
              const isSaving = Boolean(savingByProductId[product.id]);
              const images = product.images ?? [];
              return (
                <li key={product.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail src={images[0]} alt={product.name} size="sm" />
                      <div>
                        <p className="font-semibold text-[#1C1C1C]">{product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {product.sku ?? "—"}</p>
                        <p className="text-sm text-gray-500">
                          Manufacturer: {product.manufacturer ?? "—"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProductId((prev) => (prev === product.id ? null : product.id))
                      }
                      className="rounded-md bg-[#2D4A3E] px-3 py-2 text-sm font-medium text-white hover:bg-[#1E3329]"
                    >
                      {isExpanded ? "Close Editor" : "Edit Images"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-[#FAF8F5] p-4">
                      <div className="space-y-3">
                        {images.map((imageUrl, index) => {
                          const key = `${product.id}:${index}`;
                          const editingThisImage = editingImageKey === key;
                          return (
                            <div
                              key={key}
                              className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center gap-3">
                                  <ProductThumbnail src={imageUrl} alt={product.name} size="md" />
                                  <p
                                    className="max-w-[460px] truncate text-sm text-gray-700"
                                    title={imageUrl}
                                  >
                                    {imageUrl}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingImageKey(key);
                                      setEditingUrlValue(imageUrl);
                                    }}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-[#1C1C1C] hover:border-[#2D4A3E]"
                                  >
                                    Replace URL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (images.length <= 1) return;
                                      const next = images.filter((_, i) => i !== index);
                                      await saveImages(product.id, next);
                                    }}
                                    disabled={images.length <= 1 || isSaving}
                                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (index === 0) return;
                                      const next = [...images];
                                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                      await saveImages(product.id, next);
                                    }}
                                    disabled={index === 0 || isSaving}
                                    className="rounded-md border border-gray-300 p-1.5 text-gray-700 hover:border-[#2D4A3E] disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Move image up"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (index === images.length - 1) return;
                                      const next = [...images];
                                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                      await saveImages(product.id, next);
                                    }}
                                    disabled={index === images.length - 1 || isSaving}
                                    className="rounded-md border border-gray-300 p-1.5 text-gray-700 hover:border-[#2D4A3E] disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Move image down"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {editingThisImage ? (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <input
                                    value={editingUrlValue}
                                    onChange={(event) => setEditingUrlValue(event.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const cleaned = sanitizeHttpsUrl(editingUrlValue);
                                      if (!cleaned) {
                                        toast({
                                          title: "Invalid URL",
                                          description: "Image URL must start with https://",
                                          variant: "destructive",
                                        });
                                        return;
                                      }
                                      const next = [...images];
                                      next[index] = cleaned;
                                      const saved = await saveImages(product.id, next);
                                      if (saved) setEditingImageKey(null);
                                    }}
                                    className="rounded-md bg-[#2D4A3E] px-3 py-2 text-sm text-white hover:bg-[#1E3329]"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingImageKey(null)}
                                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 rounded-md border border-gray-200 bg-white p-3">
                        <p className="mb-2 text-sm font-medium text-[#1C1C1C]">Add Image URL</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={newImageUrlByProductId[product.id] ?? ""}
                            onChange={(event) =>
                              setNewImageUrlByProductId((prev) => ({
                                ...prev,
                                [product.id]: event.target.value,
                              }))
                            }
                            placeholder="https://example.com/image.jpg"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const cleaned = sanitizeHttpsUrl(newImageUrlByProductId[product.id] ?? "");
                              if (!cleaned) {
                                toast({
                                  title: "Invalid URL",
                                  description: "Image URL must start with https://",
                                  variant: "destructive",
                                });
                                return;
                              }
                              const next = [...images, cleaned];
                              const saved = await saveImages(product.id, next);
                              if (saved) {
                                setNewImageUrlByProductId((prev) => ({ ...prev, [product.id]: "" }));
                              }
                            }}
                            disabled={isSaving}
                            className="rounded-md bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3329] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {showRevalidationNoteByProductId[product.id] ? (
                        <p className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                          Images marked for re-validation.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
