import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format-price";
import { OrderStatusBadge } from "@/lib/account/order-status-badge";
import AccountOrdersPagination from "@/components/account/AccountOrdersPagination";

export const metadata: Metadata = {
  title: "Orders",
};

const PAGE_SIZE = 10;

type OrderRow = {
  id: string;
  created_at: string;
  items: unknown;
  total: number;
  status: string;
  subtotal: number;
  shipping: number;
  tax_amount: number;
};

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function itemsJsonCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}

async function OrdersContent({ page }: { page: number }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=%2Faccount%2Forders");
  }

  const { count, error: countErr } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countErr) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Could not load orders. Please try again.
      </div>
    );
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, created_at, items, total, status, subtotal, shipping, tax_amount")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Could not load orders. Please try again.
      </div>
    );
  }

  const list = (orders ?? []) as OrderRow[];

  if (total === 0) {
    return (
      <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-10 text-center shadow-sm">
        <h1 className="font-sans text-xl font-semibold text-charcoal">Orders</h1>
        <p className="mt-3 text-warm-gray">No orders yet — start shopping</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-[#2D4A3E] px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#1E3329]"
        >
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm">
      <div className="border-b border-light-sand px-6 py-5">
        <h1 className="font-sans text-xl font-semibold text-charcoal">Order history</h1>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-light-sand text-xs uppercase tracking-wide text-warm-gray">
              <th className="px-6 py-3 font-medium">Order #</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Items</th>
              <th className="px-6 py-3 font-medium">Total</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-light-sand">
            {list.map((order) => (
              <tr key={order.id} className="hover:bg-[#FAF8F5]/80">
                <td className="px-6 py-4 font-mono text-charcoal">
                  {order.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-6 py-4 text-warm-gray">{formatOrderDate(order.created_at)}</td>
                <td className="px-6 py-4 tabular-nums text-charcoal">
                  {itemsJsonCount(order.items)}
                </td>
                <td className="px-6 py-4 font-medium tabular-nums text-charcoal">
                  {formatPrice(Number(order.total) || 0)}
                </td>
                <td className="px-6 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="font-medium text-[#2D4A3E] hover:underline"
                  >
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-light-sand md:hidden">
        {list.map((order) => (
          <li key={order.id} className="px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-charcoal">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-sm text-warm-gray">{formatOrderDate(order.created_at)}</p>
                <p className="mt-1 text-sm text-warm-gray">
                  {itemsJsonCount(order.items)} {itemsJsonCount(order.items) === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-charcoal">
                  {formatPrice(Number(order.total) || 0)}
                </p>
                <div className="mt-2 flex justify-end">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            </div>
            <Link
              href={`/account/orders/${order.id}`}
              className="mt-3 inline-block text-sm font-medium text-[#2D4A3E] hover:underline"
            >
              View details
            </Link>
          </li>
        ))}
      </ul>

      <Suspense fallback={null}>
        <AccountOrdersPagination currentPage={safePage} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  return <OrdersContent page={page} />;
}
