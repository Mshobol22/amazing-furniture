import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type { CartItem, ShippingAddress } from "@/types";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_CENTS = 2900;

interface CheckoutBody {
  items: CartItem[];
  shippingAddress: ShippingAddress;
}

export async function POST(request: NextRequest) {
  try {
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

    const subtotalCents = Math.round(
      body.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ) * 100
    );

    const shippingCents =
      subtotalCents >= SHIPPING_THRESHOLD * 100 ? 0 : SHIPPING_CENTS;
    const amount = subtotalCents + shippingCents;

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        items: JSON.stringify(
          body.items.map((i) => ({
            id: i.product.id,
            qty: i.quantity,
          }))
        ),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
