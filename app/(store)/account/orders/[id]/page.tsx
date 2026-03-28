import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format-price";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import type { Product } from "@/types";

type OrderItemJson = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  variant_id?: string;
  variant_sku?: string;
  variant_size?: string;
  variant_color?: string;
};

type ShippingAddress = {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

type OrderDetail = {
  id: string;
  user_id: string;
  created_at: string;
  items: OrderItemJson[] | null;
  subtotal: number;
  shipping: number;
  tax_amount: number;
  tax_rate: number | null;
  total: number;
  shipping_address: ShippingAddress | null;
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = params;
  return { title: `Order ${id.slice(-8)}` };
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? `/account/orders/${id}`;
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const { data: orderRaw, error } = await supabase
    .from("orders")
    .select(
      "id, user_id, created_at, items, subtotal, shipping, tax_amount, tax_rate, total, shipping_address"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !orderRaw) notFound();
  const order = orderRaw as OrderDetail;
  if (order.user_id !== user.id) notFound();

  const items = Array.isArray(order.items) ? order.items : [];
  const productIds = Array.from(
    new Set(items.map((i) => i.product_id).filter(Boolean))
  );

  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("*").in("id", productIds)
      : { data: [] as Product[] };

  const productMap = new Map((products ?? []).map((p) => [p.id as string, p as Product]));

  const taxPct =
    order.tax_rate != null && Number.isFinite(Number(order.tax_rate))
      ? (Number(order.tax_rate) * 100).toFixed(2)
      : "10.25";

  const addr = order.shipping_address;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">
            Order #{id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-warm-gray">
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/account/orders"
          className="text-sm font-medium text-[#2D4A3E] hover:underline"
        >
          ← All orders
        </Link>
      </div>

      <div className="rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm">
        <div className="border-b border-light-sand px-6 py-4">
          <h2 className="font-sans text-lg font-semibold text-charcoal">Items</h2>
        </div>
        <ul className="divide-y divide-light-sand">
          {items.map((line, idx) => {
            const product = productMap.get(line.product_id);
            const src = product
              ? productLeadImageSrc(product.manufacturer, product.images?.[0])
              : null;
            const sku =
              line.variant_sku ??
              product?.sku ??
              "—";
            const lineTotal = line.price * line.quantity;
            return (
              <li
                key={`${line.product_id}-${line.variant_id ?? "base"}-${idx}`}
                className="flex gap-4 px-6 py-5"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#FAF8F5]">
                  {src ? (
                    <Image
                      src={src}
                      alt={line.name}
                      fill
                      className="object-contain p-1"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-warm-gray">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-charcoal">{line.name}</p>
                  <p className="mt-1 text-sm text-warm-gray">SKU: {sku}</p>
                  {(line.variant_size || line.variant_color) && (
                    <p className="text-sm text-warm-gray">
                      {[line.variant_size, line.variant_color].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-warm-gray">
                    Qty {line.quantity} × {formatPrice(line.price)}
                  </p>
                </div>
                <p className="shrink-0 font-sans font-semibold tabular-nums text-charcoal">
                  {formatPrice(lineTotal)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <h2 className="font-sans text-lg font-semibold text-charcoal">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-warm-gray">Subtotal</dt>
              <dd className="font-medium tabular-nums text-charcoal">
                {formatPrice(Number(order.subtotal) || 0)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-warm-gray">Shipping</dt>
              <dd className="font-medium text-charcoal">
                {Number(order.shipping) === 0 ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    FREE
                  </span>
                ) : (
                  <span className="tabular-nums">{formatPrice(Number(order.shipping) || 0)}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-warm-gray">Tax (Illinois {taxPct}%)</dt>
              <dd className="font-medium tabular-nums text-charcoal">
                {formatPrice(Number(order.tax_amount) || 0)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-light-sand pt-3 text-base">
              <dt className="font-semibold text-charcoal">Total</dt>
              <dd className="font-semibold tabular-nums text-charcoal">
                {formatPrice(Number(order.total) || 0)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <h2 className="font-sans text-lg font-semibold text-charcoal">Shipping address</h2>
          {addr ? (
            <address className="mt-4 not-italic text-sm leading-relaxed text-warm-gray">
              {addr.name && <p className="font-medium text-charcoal">{addr.name}</p>}
              {addr.address && <p>{addr.address}</p>}
              <p>
                {[addr.city, addr.state, addr.zip].filter(Boolean).join(", ")}
              </p>
              {addr.country && <p>{addr.country}</p>}
              {addr.email && <p className="mt-2">{addr.email}</p>}
            </address>
          ) : (
            <p className="mt-4 text-sm text-warm-gray">No address on file for this order.</p>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-warm-gray">
        Questions about your order?{" "}
        <Link href="/contact" className="font-medium text-[#2D4A3E] hover:underline">
          Contact us
        </Link>
      </p>
    </div>
  );
}
