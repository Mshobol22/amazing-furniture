import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Check, PackageCheck, Truck, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format-price";

export const metadata: Metadata = {
  title: "Order Confirmation",
};

type OrderItem = {
  name?: string;
  quantity?: number;
  price?: number;
};

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax_amount: number;
  total: number;
  items: unknown;
};

function getStepIndex(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return 3;
  if (s.includes("ship")) return 2;
  if (s.includes("process")) return 1;
  return 0;
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? `/order-confirmation/${orderId}`;
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const { data } = await supabase
    .from("orders")
    .select("id, created_at, status, subtotal, shipping, tax_amount, total, items")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) notFound();
  const order = data as OrderRow;
  const steps = ["Order Confirmed", "Processing", "Shipped", "Delivered"];
  const stepIndex = getStepIndex(order.status);
  const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-light-sand bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-700" />
          </div>
          <h1 className="text-3xl font-semibold text-charcoal">Thank you for your order</h1>
          <p className="mt-2 text-sm text-warm-gray">
            Order #{order.id.slice(-8).toUpperCase()} placed on{" "}
            {new Date(order.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-sm text-warm-gray">
            Estimated delivery window: 5-10 business days after shipment.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-light-sand bg-[#FAF8F5] p-4">
          <h2 className="mb-4 font-medium text-charcoal">What happens next?</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {steps.map((label, idx) => {
              const Icon = idx === 0 ? Check : idx === 1 ? PackageCheck : idx === 2 ? Truck : Home;
              const active = idx <= stepIndex;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? "bg-[#2D4A3E]/15 text-[#2D4A3E]" : "bg-gray-100 text-gray-400"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs text-[#1C1C1C]/75">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-light-sand p-4">
          <h2 className="mb-3 font-medium text-charcoal">Order summary</h2>
          <div className="space-y-2 text-sm">
            {items.map((item, idx) => (
              <div key={`${item.name ?? "item"}-${idx}`} className="flex justify-between gap-3">
                <span className="text-[#1C1C1C]/80">
                  {item.name ?? "Product"} x {item.quantity ?? 1}
                </span>
                <span>{formatPrice((item.price ?? 0) * (item.quantity ?? 1))}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-warm-gray">Subtotal</span>
              <span>{formatPrice(Number(order.subtotal) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-gray">Shipping</span>
              <span>{formatPrice(Number(order.shipping) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-gray">Tax</span>
              <span>{formatPrice(Number(order.tax_amount) || 0)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(Number(order.total) || 0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#2D4A3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3329]"
          >
            View order details
          </Link>
          <Link
            href="/collections/all"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-[#1C1C1C]/20 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-[#FAF8F5]"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

