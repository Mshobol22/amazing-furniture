"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { ShoppingBag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderRow {
  id: string;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax_amount?: number;
  total: number;
  status: string;
  shipping_address: Record<string, string> | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatItems(items: OrderItem[]): string {
  if (!Array.isArray(items) || items.length === 0) return "—";
  if (items.length === 1) return `${items[0].name} × ${items[0].quantity}`;
  return `${items[0].name} × ${items[0].quantity} + ${items.length - 1} more`;
}

export default function OrdersTab({ orders }: { orders: OrderRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-light-sand bg-white p-6">
      <h2 className="mb-6 text-2xl font-semibold text-charcoal">
        My Orders
      </h2>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="mb-4 h-16 w-16 text-warm-gray" />
          <p className="mb-2 font-medium text-charcoal">No orders yet</p>
          <p className="mb-6 text-sm text-warm-gray">
            Start shopping to see your orders here.
          </p>
          <Button asChild className="bg-walnut text-cream hover:bg-walnut/90">
            <Link href="/collections/all">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-light-sand text-left text-sm text-warm-gray">
                <th className="pb-3 font-medium">Order #</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Items</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === order.id ? null : order.id)
                    }
                    className="cursor-pointer border-b border-light-sand transition-colors hover:bg-light-sand/50"
                  >
                    <td className="py-4 font-mono text-sm text-charcoal">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 text-sm text-warm-gray">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 text-sm text-charcoal max-w-[200px] truncate">
                      {formatItems(order.items)}
                    </td>
                    <td className="py-4 font-medium text-charcoal">
                      ${Number(order.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-800"
                          }
                        >
                          {order.status}
                        </Badge>
                        <ChevronDown
                          className={`h-4 w-4 text-warm-gray transition-transform ${
                            expandedId === order.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr>
                      <td colSpan={5} className="border-b border-light-sand bg-[#FAF8F5] px-4 py-4">
                        <div className="space-y-2 text-sm">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-charcoal">
                              <span>{item.name} &times; {item.quantity}</span>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t border-light-sand pt-2 space-y-1">
                            <div className="flex justify-between text-warm-gray">
                              <span>Subtotal</span>
                              <span>${Number(order.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-warm-gray">
                              <span>Shipping</span>
                              <span>{order.shipping === 0 ? "FREE" : `$${Number(order.shipping).toFixed(2)}`}</span>
                            </div>
                            {order.tax_amount != null && order.tax_amount > 0 && (
                              <div className="flex justify-between text-warm-gray">
                                <span>Tax (10.25%)</span>
                                <span>${Number(order.tax_amount).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-charcoal border-t border-light-sand pt-1">
                              <span>Total</span>
                              <span>${Number(order.total).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
