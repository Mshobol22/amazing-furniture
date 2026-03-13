import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderRow {
  id: string;
  user_id: string;
  items: unknown;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function getItemCount(items: unknown): number {
  if (Array.isArray(items)) return items.length;
  return 0;
}

export default function OrdersTab({ orders }: { orders: OrderRow[] }) {
  return (
    <div className="rounded-lg border border-light-sand bg-white p-6">
      <h2 className="mb-6 font-display text-2xl font-semibold text-charcoal">
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
                <tr
                  key={order.id}
                  className="cursor-pointer border-b border-light-sand transition-colors hover:bg-light-sand/50"
                  onClick={() => {
                    /* Placeholder for order detail page */
                  }}
                >
                  <td className="py-4 font-mono text-sm text-charcoal">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="py-4 text-sm text-warm-gray">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-sm">{getItemCount(order.items)}</td>
                  <td className="py-4 font-medium text-charcoal">
                    ${Number(order.total).toLocaleString()}
                  </td>
                  <td className="py-4">
                    <Badge
                      className={
                        STATUS_STYLES[order.status] ??
                        "bg-gray-100 text-gray-800"
                      }
                    >
                      {order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
