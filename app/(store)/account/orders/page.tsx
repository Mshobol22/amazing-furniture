import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format-price";
import { CheckCircle2, PackageCheck, Truck, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Orders",
};

type OrderRow = {
  id: string;
  created_at: string;
  items: unknown;
  total: number;
  status: string;
};

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function shortOrderId(id: string) {
  return id.slice(-8);
}

function itemQtySum(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, row) => {
    const q = row && typeof row === "object" && "quantity" in row ? Number((row as { quantity: unknown }).quantity) : 0;
    return sum + (Number.isFinite(q) ? q : 0);
  }, 0);
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "paid") {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Paid
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-900">
        Pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-gray-800">
      {status}
    </span>
  );
}

function OrderTimeline({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const steps = [
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "processing", label: "Processing", icon: PackageCheck },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Home },
  ];
  const activeIndex =
    normalized.includes("deliver") ? 3 :
    normalized.includes("ship") ? 2 :
    normalized.includes("process") ? 1 :
    normalized.includes("paid") || normalized.includes("confirm") ? 0 : 0;

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = idx <= activeIndex;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isActive ? "bg-[#2D4A3E]/15 text-[#2D4A3E]" : "bg-gray-100 text-gray-400"}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            {idx < steps.length - 1 ? (
              <div className={`h-[2px] w-4 ${isActive ? "bg-[#2D4A3E]/40" : "bg-gray-200"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? "/account/orders";
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, items, total, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (orders ?? []) as OrderRow[];

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-10 text-center shadow-sm">
        <h1 className="font-sans text-xl font-semibold text-charcoal">Order history</h1>
        <p className="mt-3 text-warm-gray">No orders yet</p>
        <Link
          href="/collections/all"
          className="mt-6 inline-flex rounded-lg bg-[#2D4A3E] px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#1E3329]"
        >
          Shop now
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm">
      <div className="border-b border-light-sand px-6 py-5">
        <h1 className="font-sans text-xl font-semibold text-charcoal">Order history</h1>
      </div>
      <ul className="divide-y divide-light-sand">
        {list.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.id}`}
              className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-[#FAF8F5] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-charcoal">{formatOrderDate(order.created_at)}</p>
                <p className="text-sm text-warm-gray">
                  Order #{shortOrderId(order.id)} · {itemQtySum(order.items)}{" "}
                  {itemQtySum(order.items) === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <OrderTimeline status={order.status} />
                <span className="font-sans text-base font-semibold tabular-nums text-charcoal">
                  {formatPrice(Number(order.total) || 0)}
                </span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
