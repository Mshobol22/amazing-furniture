import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/service";
import { sendOrderConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    // Never expose the reason — could leak internal info
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 2. Handle events — always return 200 so Stripe stops retrying ──────
  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;

      if (!orderId) {
        // Payment has no order attached — nothing to update
        console.error("payment_intent.succeeded: no order_id in metadata", paymentIntent.id);
        return NextResponse.json({ received: true });
      }

      // Update the pending order to paid and record the payment intent ID
      const { data: order, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_id: paymentIntent.id, // keep legacy column in sync
        })
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateError || !order) {
        console.error("Failed to update order to paid:", updateError?.message);
        return NextResponse.json({ received: true });
      }

      // Send confirmation email
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
        // Email failure must not block the order from being marked paid
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
    // Log internally but always return 200 — prevents Stripe infinite retries
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
