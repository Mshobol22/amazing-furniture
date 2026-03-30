import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CartItem, ShippingAddress } from "@/types";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;
const ILLINOIS_TAX_RATE = 0.1025; // 6.25% state + 1.75% county + 1.25% city + 1% RTA

interface CheckoutBody {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  consent?: boolean;
  customerEmail?: string;
  discountCode?: string;
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

    if (!body.consent) {
      return NextResponse.json(
        { error: "Terms and Privacy Policy consent is required" },
        { status: 400 }
      );
    }

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

    // ── 3. Server-side variant validation (before any Stripe calls) ──────────
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const variantCartItems = body.items.filter((item) => item.variant_id);
    if (variantCartItems.length > 0) {
      const variantIds = variantCartItems.map((item) => item.variant_id!);
      const { data: variantRows } = await supabaseAdmin
        .from("product_variants")
        .select("id, in_stock, size, color")
        .in("id", variantIds);

      for (const item of variantCartItems) {
        const row = variantRows?.find((r) => r.id === item.variant_id);
        if (!row) {
          return NextResponse.json(
            { error: "One or more items are no longer available. Please refresh your cart." },
            { status: 400 }
          );
        }
        if (!row.in_stock) {
          const detail = [item.variant_size, item.variant_color]
            .filter(Boolean)
            .join(" / ");
          return NextResponse.json(
            {
              error: `${item.product.name}${detail ? ` (${detail})` : ""} is out of stock. Please remove it from your cart to continue.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // ── 4. Build order items — price computed server-side ─────────────────
    const orderItems = body.items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: item.variant_price ?? getEffectivePrice(item.product),
      quantity: item.quantity,
      ...(item.variant_id && {
        variant_id: item.variant_id,
        variant_sku: item.variant_sku,
        variant_size: item.variant_size,
        variant_color: item.variant_color,
      }),
    }));

    // ── 5. Calculate amounts — guard against NaN if product price is missing
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const taxAmount = Math.round(subtotal * ILLINOIS_TAX_RATE * 100) / 100;
    const normalizedCustomerEmail = (
      body.customerEmail ||
      body.shippingAddress.email ||
      user.email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!normalizedCustomerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    let appliedDiscountCode: string | null = null;

    if (body.discountCode && body.discountCode.trim()) {
      const trimmedCode = body.discountCode.trim().toUpperCase();

      const { data: discountRow, error: discountCodeError } = await supabaseAdmin
        .from("discount_codes")
        .select("code, discount_percent")
        .eq("code", trimmedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (discountCodeError || !discountRow) {
        return NextResponse.json({ error: "Invalid discount code" }, { status: 400 });
      }

      const { data: existingRedemption, error: redemptionCheckError } = await supabaseAdmin
        .from("discount_redemptions")
        .select("id")
        .eq("code", trimmedCode)
        .eq("email", normalizedCustomerEmail)
        .maybeSingle();

      if (redemptionCheckError) {
        return NextResponse.json(
          { error: "Unable to validate discount code" },
          { status: 500 }
        );
      }

      if (existingRedemption) {
        return NextResponse.json(
          { error: "This discount code has already been used" },
          { status: 400 }
        );
      }

      discountAmount =
        Math.round(subtotal * (discountRow.discount_percent / 100) * 100) / 100;
      appliedDiscountCode = trimmedCode;
    }

    const finalTotal = Math.max(0.5, subtotal - discountAmount + shippingCost + taxAmount);
    const totalCents = Math.round(finalTotal * 100);

    if (
      !isFinite(subtotal) ||
      subtotal <= 0 ||
      !isFinite(finalTotal) ||
      totalCents <= 0
    ) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: body.shippingAddress.name,
        customer_email: normalizedCustomerEmail,
        items: orderItems,
        subtotal,
        shipping: shippingCost,
        tax_amount: taxAmount,
        tax_rate: ILLINOIS_TAX_RATE,
        total: finalTotal,
        status: "pending",
        shipping_address: body.shippingAddress,
        discount_code: appliedDiscountCode,
        discount_amount: discountAmount,
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
