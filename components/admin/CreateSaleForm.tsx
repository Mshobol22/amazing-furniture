"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Products" },
  { value: "sofa", label: "Sofas & Sectionals" },
  { value: "bed", label: "Beds & Bedroom" },
  { value: "table", label: "Dining & Tables" },
  { value: "chair", label: "Chairs & Recliners" },
  { value: "cabinet", label: "Cabinets & Storage" },
  { value: "tv-stand", label: "TV Stands & Media" },
];

const PRODUCT_COUNTS: Record<string, number> = {
  all: 291,
  sofa: 55,
  bed: 49,
  table: 100,
  chair: 25,
  cabinet: 53,
  "tv-stand": 9,
};

export default function CreateSaleForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ category: "all", discount: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { category, discount } = formData;
  const discountNum = parseFloat(discount);
  const isValidDiscount =
    !isNaN(discountNum) && discountNum >= 1 && discountNum <= 90;
  const productCount = PRODUCT_COUNTS[category] ?? 0;
  const categoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    if (!isValidDiscount) return;

    const payload = { category, discount: discountNum };
    console.log("CreateSaleForm submit:", payload);

    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const count = typeof data.updated === "number" ? data.updated : 0;
        setSuccess(`Sale applied to ${count} products`);
        setFormData((prev) => ({ ...prev, discount: "" }));
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-medium text-charcoal">Create New Sale</h2>
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-sm text-warm-gray">Category</label>
            <select
              value={category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-warm-gray">
              Discount %
            </label>
            <input
              name="discount"
              type="number"
              min={1}
              max={90}
              value={discount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, discount: e.target.value }))
              }
              placeholder="e.g. 20"
              className="mt-1 w-24 rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {discount && (
          <p className="text-sm text-warm-gray">
            {isValidDiscount
              ? `${discountNum}% off ${categoryLabel} — affects ${productCount} products`
              : "Enter a discount between 1 and 90"}
          </p>
        )}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || !isValidDiscount}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#8B6914" }}
          >
            Apply Sale
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
