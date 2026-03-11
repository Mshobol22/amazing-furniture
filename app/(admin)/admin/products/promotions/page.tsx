"use client";

import { useState, useEffect } from "react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "bed", label: "Bed" },
  { value: "chair", label: "Chair" },
  { value: "sofa", label: "Sofa" },
  { value: "table", label: "Table" },
  { value: "cabinet", label: "Cabinet" },
  { value: "tv-stand", label: "TV Stand" },
];

interface SaleInfo {
  category: string;
  count: number;
  discount: number;
}

export default function PromotionsPage() {
  const [category, setCategory] = useState("all");
  const [discount, setDiscount] = useState("");
  const [activeSales, setActiveSales] = useState<SaleInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveSales = async () => {
    const res = await fetch("/api/admin/promotions");
    if (res.ok) {
      const data = await res.json();
      setActiveSales(data);
    }
  };

  useEffect(() => {
    fetchActiveSales();
  }, []);

  const handleApplySale = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(discount);
    if (isNaN(pct) || pct <= 0 || pct >= 100) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category === "all" ? null : category,
          discountPercent: pct,
        }),
      });
      if (res.ok) {
        await fetchActiveSales();
        setDiscount("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndSale = async (cat: string) => {
    setLoading(true);
    try {
      await fetch("/api/admin/promotions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat === "all" ? null : cat }),
      });
      await fetchActiveSales();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Promotions
      </h1>

      <div className="mb-12 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-charcoal">Create Sale</h2>
        <form onSubmit={handleApplySale} className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-warm-gray">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 rounded-md border px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
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
              type="number"
              min="1"
              max="99"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="e.g. 20"
              className="mt-1 w-24 rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !discount}
              className="rounded-md bg-walnut px-4 py-2 text-sm font-medium text-cream hover:bg-walnut/90 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-charcoal">Active Sales</h2>
        {activeSales.length === 0 ? (
          <p className="text-warm-gray">No active sales.</p>
        ) : (
          <ul className="space-y-2">
            {activeSales.map((sale) => (
              <li
                key={sale.category}
                className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-2"
              >
                <span>
                  {sale.category === "all" ? "All Categories" : sale.category}:{" "}
                  {sale.count} products @ {sale.discount}% off
                </span>
                <button
                  onClick={() => handleEndSale(sale.category)}
                  disabled={loading}
                  className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  End Sale
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
