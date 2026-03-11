import { createAdminClient } from "@/lib/supabase/admin";
import { Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";

async function getStats() {
  const supabase = createAdminClient();

  const [productsRes, ordersRes, outOfStockRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total, status"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("in_stock", false),
  ]);

  const totalProducts = productsRes.count ?? 0;
  const orders = ordersRes.data ?? [];
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0);
  const outOfStock = outOfStockRes.count ?? 0;

  return { totalProducts, totalOrders, totalRevenue, outOfStock };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "Total Products",
      value: stats.totalProducts,
      icon: Package,
    },
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
    },
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      label: "Products Out of Stock",
      value: stats.outOfStock,
      icon: AlertTriangle,
    },
  ];

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-warm-gray">{card.label}</p>
              <card.icon className="h-5 w-5 text-warm-gray" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-charcoal">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
