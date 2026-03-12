import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/service";
import { sendOrderConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
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
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single();

      if (order) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "processing" })
          .eq("id", order.id);

        // Parse items if stored as string
        const items =
          typeof order.items === "string" ? JSON.parse(order.items) : order.items;

        const rawAddress =
          typeof order.shipping_address === "string"
            ? JSON.parse(order.shipping_address)
            : order.shipping_address;
        const shippingAddress = {
          address: rawAddress?.address ?? rawAddress?.street ?? "",
          city: rawAddress?.city ?? "",
          state: rawAddress?.state ?? "",
          zip: rawAddress?.zip ?? rawAddress?.zipCode ?? "",
        };

        await sendOrderConfirmation({
          id: order.id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          total: Number(order.total),
          items,
          shipping_address: shippingAddress,
        });
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled" })
          .eq("stripe_payment_intent_id", charge.payment_intent);
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Still return 200 so Stripe doesn't retry endlessly
  }

  return NextResponse.json({ received: true });
}
