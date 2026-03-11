"use client";

import { useState, useMemo, Fragment } from "react";
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
  total: number;
  status: string;
  shipping_address: Record<string, unknown>;
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
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

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  key={order.id}
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
                                  {item.name} × {item.quantity}
                                </span>
                                <span>
                                  $
                                  {(item.price * item.quantity).toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
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
