import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (typeof body.price === "number") updates.price = body.price;
    if (typeof body.in_stock === "boolean") updates.in_stock = body.in_stock;
    if (typeof body.on_sale === "boolean") updates.on_sale = body.on_sale;

    // Validate sale_price when setting a sale
    if (body.sale_price !== undefined) {
      if (body.sale_price === null) {
        // Clearing sale price is always allowed
        updates.sale_price = null;
      } else {
        const salePrice = Number(body.sale_price);
        if (!isFinite(salePrice) || salePrice <= 0) {
          return NextResponse.json(
            { error: "sale_price must be a positive number" },
            { status: 400 }
          );
        }
        // Fetch original price to validate sale_price < price
        const admin = createAdminClient();
        const { data: existing } = await admin
          .from("products")
          .select("price")
          .eq("id", id)
          .single();
        if (existing) {
          const originalPrice = Number(existing.price);
          if (salePrice >= originalPrice) {
            return NextResponse.json(
              { error: `sale_price must be less than original price ($${originalPrice.toFixed(2)})` },
              { status: 400 }
            );
          }
        }
        updates.sale_price = Math.round(salePrice * 100) / 100;
      }
    }
    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (trimmed) updates.name = trimmed;
    }
    if (typeof body.description === "string") updates.description = body.description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Admin product update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
