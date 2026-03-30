import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  // ── 1. Verify Stripe webhook signature BEFORE processing anything ──────
  const buf = await request.arrayBuffer();
  const rawBody = Buffer.from(buf);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Service-role client initialized here (request time, not cold-start) ──
  // Module-level init can capture undefined env vars on Vercel cold-start.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── 2. Handle events ─────────────────────────────────────────────────────
  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;

      if (!orderId) {
        return NextResponse.json({ error: "No order_id in metadata" }, { status: 400 });
      }

      // ── Update order to paid — service role bypasses RLS ──────────────
      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", orderId)
        .select();

      if (error || !data?.length) {
        console.error("Webhook: failed to update order", orderId, error?.message);
        return NextResponse.json({ received: true });
      }

      const order = data[0];

      if (order.discount_code && order.customer_email) {
        try {
          await supabaseAdmin.from("discount_redemptions").upsert(
            {
              code: order.discount_code,
              email: String(order.customer_email).trim().toLowerCase(),
              order_id: order.id,
            },
            { onConflict: "code,email", ignoreDuplicates: true }
          );

          const { data: discountCodeRow } = await supabaseAdmin
            .from("discount_codes")
            .select("uses_count")
            .eq("code", order.discount_code)
            .maybeSingle();

          const nextUsesCount = Number(discountCodeRow?.uses_count ?? 0) + 1;
          await supabaseAdmin
            .from("discount_codes")
            .update({ uses_count: nextUsesCount })
            .eq("code", order.discount_code);
        } catch (discountErr) {
          console.error(
            "Webhook: discount redemption update failed",
            order.id,
            (discountErr as Error).message
          );
        }
      }

      // ── Decrement variant stock — fire-and-forget, never block 200 ────
      try {
        const orderLineItems = Array.isArray(order.items) ? order.items : [];
        const variantLineItems = orderLineItems.filter(
          (item: Record<string, unknown>) => item.variant_id
        );
        for (const item of variantLineItems) {
          await supabaseAdmin.rpc("decrement_variant_stock", {
            variant_id: item.variant_id as string,
            qty: item.quantity as number,
          });
        }
      } catch (stockErr) {
        console.error(
          "Webhook: stock decrement failed",
          order.id,
          (stockErr as Error).message
        );
      }

      // ── Send confirmation email — only after confirmed DB update ──────
      try {
        const items = Array.isArray(order.items) ? order.items : [];
        const rawAddress = order.shipping_address ?? {};
        await sendOrderConfirmation({
          id: order.id,
          customer_name: order.customer_name ?? "Customer",
          customer_email: order.customer_email ?? "",
          subtotal: Number(order.subtotal),
          total: Number(order.total),
          tax_amount: Number(order.tax_amount ?? 0),
          tax_rate: Number(order.tax_rate ?? 0),
          items,
          shipping_address: {
            address: rawAddress.address ?? rawAddress.street ?? "",
            city: rawAddress.city ?? "",
            state: rawAddress.state ?? "",
            zip: rawAddress.zip ?? rawAddress.zipCode ?? "",
          },
        });
      } catch (emailErr) {
        console.error("Webhook: email failed", order.id, (emailErr as Error).message);
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled" })
          .eq("stripe_payment_intent_id", String(charge.payment_intent));
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
