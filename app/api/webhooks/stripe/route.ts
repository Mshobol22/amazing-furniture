import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Service-role client — module level, no shared import, bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    // Never expose the reason — could leak internal info
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 2. Handle events ─────────────────────────────────────────────────────
  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log("=== WEBHOOK FIRED ===");
      console.log("Event type:", event.type);
      console.log("PI metadata:", JSON.stringify(paymentIntent.metadata));
      console.log("order_id from metadata:", paymentIntent.metadata?.order_id);

      const orderId = paymentIntent.metadata?.order_id;

      if (!orderId) {
        console.error("CRITICAL: No order_id in webhook metadata", paymentIntent.id);
        return NextResponse.json({ error: "No order_id in metadata" }, { status: 400 });
      }

      // Update order to paid — service role bypasses RLS
      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_id: paymentIntent.id,
        })
        .eq("id", orderId)
        .select();

      console.log("Update result data:", JSON.stringify(data));
      console.log("Update error:", JSON.stringify(error));
      console.log("Rows updated:", data?.length ?? 0);

      if (error || !data?.length) {
        console.error("Failed to update order to paid:", error?.message, "order_id:", orderId);
        return NextResponse.json({ received: true });
      }

      const order = data[0];
      console.log("Order updated to paid:", orderId);

      // Send confirmation email — failure must not block order update
      try {
        const items = Array.isArray(order.items) ? order.items : [];
        const rawAddress = order.shipping_address ?? {};
        await sendOrderConfirmation({
          id: order.id,
          customer_name: order.customer_name ?? "Customer",
          customer_email: order.customer_email ?? "",
          total: Number(order.total),
          items,
          shipping_address: {
            address: rawAddress.address ?? rawAddress.street ?? "",
            city: rawAddress.city ?? "",
            state: rawAddress.state ?? "",
            zip: rawAddress.zip ?? rawAddress.zipCode ?? "",
          },
        });
      } catch (emailErr) {
        console.error("Failed to send order confirmation email:", emailErr);
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
