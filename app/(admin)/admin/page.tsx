import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Package, CheckCircle, XCircle, Tag } from "lucide-react";

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
    totalProducts: totalRes.count ?? 0,
    inStock: inStockRes.count ?? 0,
    outOfStock: outOfStockRes.count ?? 0,
    onSale: onSaleRes.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total Products", value: stats.totalProducts, icon: Package, href: "/admin/products" },
    { label: "In Stock", value: stats.inStock, icon: CheckCircle, href: "/admin/products?status=in-stock" },
    { label: "Out of Stock", value: stats.outOfStock, icon: XCircle, href: "/admin/products?status=out-of-stock" },
    { label: "On Sale", value: stats.onSale, icon: Tag, href: "/admin/products?promotions=active" },
  ];

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-warm-gray">{card.label}</p>
              <card.icon className="h-5 w-5 text-warm-gray" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-charcoal">
              {card.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
