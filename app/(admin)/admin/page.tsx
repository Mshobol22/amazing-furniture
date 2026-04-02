import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Package,
  CheckCircle,
  XCircle,
  Tag,
  Plus,
  ShoppingBag,
  LayoutGrid,
  ImageIcon,
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

type CollectionGroupRow = {
  collection_group: string | null;
  is_collection_hero: boolean | null;
  bundle_skus: string[] | null;
};

type CollectionStatus = "complete" | "no-hero" | "no-pieces" | "single";

function getCollectionStatus(rows: CollectionGroupRow[]): CollectionStatus {
  const pieceCount = rows.length;
  const heroes = rows.filter((row) => row.is_collection_hero === true);
  const hero = heroes[0];
  const heroBundleSkus = hero?.bundle_skus ?? [];

  if (pieceCount === 1) return "single";
  if (heroes.length === 1 && pieceCount >= 2) return "complete";
  if (heroes.length === 0) return "no-hero";
  if (heroBundleSkus.length === 0 || pieceCount <= 1) return "no-pieces";
  return "no-hero";
}

async function getToolStats() {
  const supabase = createAdminClient();
  const [{ data: collectionRows }, { count: fullyBrokenCount }] = await Promise.all([
    supabase
      .from("products")
      .select("collection_group, is_collection_hero, bundle_skus")
      .not("collection_group", "is", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("images_validated", false),
  ]);

  const grouped = new Map<string, CollectionGroupRow[]>();
  for (const row of (collectionRows ?? []) as CollectionGroupRow[]) {
    const key = (row.collection_group ?? "").trim();
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  let collectionsNeedingAttention = 0;
  grouped.forEach((rows) => {
    const status = getCollectionStatus(rows);
    if (status === "no-hero" || status === "no-pieces") {
      collectionsNeedingAttention += 1;
    }
  });

  return {
    collectionsNeedingAttention,
    fullyBrokenImages: fullyBrokenCount ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const [stats, toolStats] = await Promise.all([getStats(), getToolStats()]);

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
      href: "/admin/sales",
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
      href: "/admin/sales",
      color: "text-amber-600 bg-amber-50 hover:bg-amber-100",
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
      <h1 className="mb-8 text-2xl font-semibold text-charcoal">
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-[#2D4A3E]/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-2 text-xs text-gray-400 transition-colors group-hover:text-[#2D4A3E]">
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

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Tools
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/collections"
            className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-[#2D4A3E]"
          >
            <div className="flex items-start justify-between gap-3">
              <LayoutGrid className="h-6 w-6 text-[#2D4A3E]" />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  toolStats.collectionsNeedingAttention > 0
                    ? "bg-yellow-100 text-yellow-900"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {toolStats.collectionsNeedingAttention}
              </span>
            </div>
            <h3 className="mt-3 text-base font-semibold text-[#1C1C1C]">Collections</h3>
            <p className="mt-1 text-sm text-gray-600">
              Group products into collections, set heroes and bundle SKUs
            </p>
          </Link>

          <Link
            href="/admin/image-validation"
            className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-[#2D4A3E]"
          >
            <div className="flex items-start justify-between gap-3">
              <CheckCircle className="h-6 w-6 text-[#2D4A3E]" />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  toolStats.fullyBrokenImages > 0
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {toolStats.fullyBrokenImages}
              </span>
            </div>
            <h3 className="mt-3 text-base font-semibold text-[#1C1C1C]">
              Image Validation
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Validate product image URLs and fix broken images
            </p>
          </Link>

          <Link
            href="/admin/products/images"
            className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-[#2D4A3E]"
          >
            <div className="flex items-start justify-between gap-3">
              <ImageIcon className="h-6 w-6 text-[#2D4A3E]" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-[#1C1C1C]">Image Manager</h3>
            <p className="mt-1 text-sm text-gray-600">
              Edit, replace or reorder product images individually
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
