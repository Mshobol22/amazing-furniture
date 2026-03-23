"use client";

import { useState, useMemo, Fragment, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  subtotal?: number;
  shipping?: number;
  tax_amount?: number;
  total: number;
  status: string;
  shipping_address: Record<string, unknown>;
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    variant_id?: string;
    variant_sku?: string;
    variant_size?: string;
    variant_color?: string;
  }>;
  stripe_payment_intent_id?: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_COLORS[status.toLowerCase()] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

function formatOrderNumber(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OrdersTableInner({ orders }: { orders: OrderRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const statusFilter = searchParams.get("status") || "all";

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status.toLowerCase() === statusFilter);
  }, [orders, statusFilter]);

  const selectedOrder = selectedId
    ? orders.find((o) => o.id === selectedId)
    : null;

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-warm-gray">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-warm-gray">Filter:</span>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Order ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Customer Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Total ($)
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <Fragment key={order.id}>
                <tr
                  onClick={() =>
                    setSelectedId(selectedId === order.id ? null : order.id)
                  }
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-charcoal">
                    {formatOrderNumber(order.id)}
                  </td>
                  <td className="px-4 py-2 text-charcoal">
                    {order.customer_name}
                  </td>
                  <td className="px-4 py-2 text-warm-gray">
                    {order.customer_email}
                  </td>
                  <td className="px-4 py-2 text-charcoal">
                    ${Number(order.total).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-2 text-warm-gray">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
                {selectedId === order.id && selectedOrder && (
                  <tr key={`${order.id}-detail`} className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-6">
                      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                        <div>
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Full Order ID
                          </h3>
                          <p className="font-mono text-sm text-charcoal">
                            {selectedOrder.id}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Items
                          </h3>
                          <ul className="mt-2 space-y-2">
                            {selectedOrder.items?.map((item, i) => (
                              <li
                                key={i}
                                className="flex justify-between text-sm text-charcoal"
                              >
                                <span>
                                  <span>{item.name} × {item.quantity}</span>
                                  {(item.variant_size || item.variant_color) && (
                                    <span className="ml-1 text-gray-500">
                                      ({[item.variant_size, item.variant_color].filter(Boolean).join(" / ")})
                                    </span>
                                  )}
                                  {item.variant_sku && (
                                    <span className="block text-xs text-gray-400">
                                      SKU: {item.variant_sku}
                                    </span>
                                  )}
                                </span>
                                <span>
                                  $
                                  {(item.price * item.quantity).toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-1 text-sm">
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Totals
                          </h3>
                          {selectedOrder.subtotal != null && (
                            <div className="flex justify-between text-charcoal">
                              <span>Subtotal</span>
                              <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                            </div>
                          )}
                          {selectedOrder.shipping != null && (
                            <div className="flex justify-between text-charcoal">
                              <span>Shipping</span>
                              <span>{selectedOrder.shipping === 0 ? "FREE" : `$${Number(selectedOrder.shipping).toFixed(2)}`}</span>
                            </div>
                          )}
                          {selectedOrder.tax_amount != null && selectedOrder.tax_amount > 0 && (
                            <div className="flex justify-between text-charcoal">
                              <span>Tax (10.25%)</span>
                              <span>${Number(selectedOrder.tax_amount).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-charcoal border-t border-gray-100 pt-1">
                            <span>Total</span>
                            <span>${Number(selectedOrder.total).toFixed(2)}</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Shipping Address
                          </h3>
                          <pre className="mt-2 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-charcoal">
                            {JSON.stringify(
                              selectedOrder.shipping_address,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                        {selectedOrder.stripe_payment_intent_id && (
                          <div>
                            <h3 className="text-xs font-medium uppercase text-warm-gray">
                              Stripe Payment Intent ID
                            </h3>
                            <p className="mt-1 font-mono text-sm text-charcoal">
                              {selectedOrder.stripe_payment_intent_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded bg-gray-100" />}>
      <OrdersTableInner orders={orders} />
    </Suspense>
  );
}
