import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CartItem, ShippingAddress } from "@/types";
import { getEffectivePrice } from "@/store/cartStore";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;

interface CreateOrderBody {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  stripePaymentIntentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body: CreateOrderBody = await request.json();

    if (!body.items?.length || !body.shippingAddress || !body.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "Items, shipping address, and payment ID are required" },
        { status: 400 }
      );
    }

    const subtotal = body.items.reduce(
      (sum, item) => sum + getEffectivePrice(item.product) * item.quantity,
      0
    );
    const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shipping;

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        customer_name: body.shippingAddress.name,
        customer_email: body.shippingAddress.email,
        total,
        status: "pending",
        shipping_address: body.shippingAddress,
        items: body.items.map((i) => ({
          product_id: i.product.id,
          name: i.product.name,
          slug: i.product.slug,
          price: getEffectivePrice(i.product),
          quantity: i.quantity,
          image: i.product.images[0],
        })),
        stripe_payment_intent_id: body.stripePaymentIntentId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Order creation error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId: order?.id });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
