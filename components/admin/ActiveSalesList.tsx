"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format-price";

interface ActiveSalesListProps {
  products: Product[];
}

export default function ActiveSalesList({ products }: ActiveSalesListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [endAllLoading, setEndAllLoading] = useState(false);

  const handleEndSale = async (product: Product) => {
    setLoading(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on_sale: false, sale_price: null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleEndAllSales = async () => {
    setEndAllLoading(true);
    try {
      const res = await fetch("/api/admin/promotions/end-all", {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } finally {
      setEndAllLoading(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-warm-gray">No active promotions running</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-medium text-charcoal">Active Sales</h2>
        <button
          onClick={handleEndAllSales}
          disabled={endAllLoading}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          End All Sales
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Product Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Category
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Original Price
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Sale Price
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Discount %
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const discountPct =
                product.price > 0 && product.sale_price != null
                  ? Math.round(
                      (1 - product.sale_price / product.price) * 100
                    )
                  : 0;
              return (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-charcoal">
                    {product.name}
                  </td>
                  <td className="px-4 py-2 text-warm-gray">
                    {product.category}
                  </td>
                  <td className="px-4 py-2 text-warm-gray">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-4 py-2 font-medium text-red-600">
                    {formatPrice(product.sale_price ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-warm-gray">{discountPct}%</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleEndSale(product)}
                      disabled={loading === product.id}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      End Sale
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
