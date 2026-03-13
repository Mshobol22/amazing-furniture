import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Package,
  CheckCircle,
  XCircle,
  Tag,
  Plus,
  Megaphone,
  ShoppingBag,
} from "lucide-react";

async function getStats() {
  const supabase = createAdminClient();

  const [totalRes, inStockRes, outOfStockRes, onSaleRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("in_stock", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("in_stock", false),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("on_sale", true),
  ]);

  return {
    total: totalRes.count ?? 0,
    inStock: inStockRes.count ?? 0,
    outOfStock: outOfStockRes.count ?? 0,
    onSale: onSaleRes.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      label: "Total Products",
      value: stats.total,
      icon: Package,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      href: "/admin/products",
      change: "View all →",
    },
    {
      label: "In Stock",
      value: stats.inStock,
      icon: CheckCircle,
      iconColor: "text-green-700",
      iconBg: "bg-green-100",
      href: "/admin/products?category=all&status=in-stock",
      change: "View in-stock →",
    },
    {
      label: "Out of Stock",
      value: stats.outOfStock,
      icon: XCircle,
      iconColor: stats.outOfStock > 0 ? "text-red-600" : "text-gray-400",
      iconBg: stats.outOfStock > 0 ? "bg-red-100" : "bg-gray-100",
      href: "/admin/products?category=all&status=out-of-stock",
      change: stats.outOfStock > 0 ? "Needs attention" : "All good",
    },
    {
      label: "On Sale",
      value: stats.onSale,
      icon: Tag,
      iconColor: "text-amber-700",
      iconBg: "bg-amber-100",
      href: "/admin/promotions",
      change: "Manage sales →",
    },
  ];

  const quickActions = [
    {
      label: "Add Product",
      icon: Plus,
      href: "/admin/products",
      color: "text-blue-600 bg-blue-50 hover:bg-blue-100",
    },
    {
      label: "Run Sale",
      icon: Tag,
      href: "/admin/promotions",
      color: "text-amber-600 bg-amber-50 hover:bg-amber-100",
    },
    {
      label: "Post Banner",
      icon: Megaphone,
      href: "/admin/banners",
      color: "text-purple-600 bg-purple-50 hover:bg-purple-100",
    },
    {
      label: "View Orders",
      icon: ShoppingBag,
      href: "/admin/orders",
      color: "text-green-600 bg-green-50 hover:bg-green-100",
    },
  ];

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-[#8B6914]/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-2 text-xs text-gray-400 transition-colors group-hover:text-[#8B6914]">
                  {card.change}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors ${action.color}`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
