"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
    slug: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

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
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-warm-gray">No orders yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Order #
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Total
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
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => setSelectedOrder(order)}
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
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-charcoal">
                  Order {formatOrderNumber(selectedOrder.id)}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-warm-gray">
                    Customer
                  </h3>
                  <p className="font-medium text-charcoal">
                    {selectedOrder.customer_name}
                  </p>
                  <p className="text-sm text-warm-gray">
                    {selectedOrder.customer_email}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-warm-gray">
                    Shipping Address
                  </h3>
                  <p className="text-sm text-charcoal">
                    {[
                      (selectedOrder.shipping_address as { name?: string })?.name,
                      (selectedOrder.shipping_address as { address?: string })?.address,
                      [
                        (selectedOrder.shipping_address as { city?: string })?.city,
                        (selectedOrder.shipping_address as { state?: string })?.state,
                        (selectedOrder.shipping_address as { zip?: string })?.zip,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      (selectedOrder.shipping_address as { country?: string })?.country,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-warm-gray">Items</h3>
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
                <div className="border-t pt-4">
                  <p className="flex justify-between font-semibold text-charcoal">
                    Total
                    <span>
                      ${Number(selectedOrder.total).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
