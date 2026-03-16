import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CartItem, ShippingAddress } from "@/types";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;

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
    // ── 1. Require authenticated user ──────────────────────────────────────
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

    // ── 3. Build order items — price computed server-side ─────────────────
    const orderItems = body.items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: getEffectivePrice(item.product),
      quantity: item.quantity,
    }));

    // ── 4. Calculate amounts — guard against NaN if product price is missing
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shippingCost;
    const totalCents = Math.round(total * 100);

    if (!isFinite(subtotal) || subtotal <= 0 || !isFinite(total) || totalCents <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // ── 5. Create PENDING order in Supabase via inline service-role client ─
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: body.shippingAddress.name,
        customer_email: body.shippingAddress.email || user.email,
        items: orderItems,
        subtotal,
        shipping: shippingCost,
        total,
        status: "pending",
        shipping_address: body.shippingAddress,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Checkout: order insert failed", orderError?.message);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // ── 6. Create Stripe PaymentIntent with order_id in metadata ──────────
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
