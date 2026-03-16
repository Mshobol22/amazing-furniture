import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { CartItem, ShippingAddress } from "@/types";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_CENTS = 2900;

interface CheckoutBody {
  items: CartItem[];
  shippingAddress: ShippingAddress;
}

function getEffectivePrice(product: CartItem["product"]): number {
  if (product.on_sale && product.sale_price) return product.sale_price;
  return product.price;
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Require authenticated user (server-side check) ─────────────────
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Validate request body ──────────────────────────────────────────
    const body: CheckoutBody = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items are required and cannot be empty" },
        { status: 400 }
      );
    }

    if (!body.shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    // ── 3. Calculate amounts ──────────────────────────────────────────────
    const subtotalCents = Math.round(
      body.items.reduce(
        (sum, item) => sum + getEffectivePrice(item.product) * item.quantity,
        0
      ) * 100
    );

    const shippingCents =
      subtotalCents >= SHIPPING_THRESHOLD * 100 ? 0 : SHIPPING_CENTS;
    const totalCents = subtotalCents + shippingCents;

    if (totalCents <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // ── 4. Build order items for DB storage ───────────────────────────────
    const orderItems = body.items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: getEffectivePrice(item.product),
      quantity: item.quantity,
    }));

    // ── 5. Create PENDING order in Supabase (service role — server only) ──
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: body.shippingAddress.name,
        customer_email: body.shippingAddress.email || user.email,
        items: orderItems,
        subtotal: subtotalCents / 100,
        shipping: shippingCents / 100,
        total: totalCents / 100,
        status: "pending",
        shipping_address: body.shippingAddress,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Failed to create order record");
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // ── 6. Create Stripe PaymentIntent — pass order_id in metadata ────────
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      metadata: {
        order_id: order.id,
        user_id: user.id,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId: order.id,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
