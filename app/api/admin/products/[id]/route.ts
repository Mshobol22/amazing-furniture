import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const COLLECTION_GROUP_REGEX = /^[a-zA-Z0-9-]*$/;

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
    const admin = createAdminClient();
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
    if (body.collection_group !== undefined) {
      if (body.collection_group === null || body.collection_group === "") {
        updates.collection_group = null;
      } else if (typeof body.collection_group === "string") {
        const trimmed = body.collection_group.trim();
        if (!COLLECTION_GROUP_REGEX.test(trimmed)) {
          return NextResponse.json(
            { error: "collection_group must contain only letters, numbers, and hyphens" },
            { status: 400 }
          );
        }
        updates.collection_group = trimmed;
      }
    }
    if (body.piece_type !== undefined) {
      if (body.piece_type === null || body.piece_type === "") {
        updates.piece_type = null;
      } else if (typeof body.piece_type === "string") {
        updates.piece_type = body.piece_type.trim();
      }
    }
    if (typeof body.is_collection_hero === "boolean") {
      updates.is_collection_hero = body.is_collection_hero;
    }
    if (body.bundle_skus !== undefined) {
      if (!Array.isArray(body.bundle_skus)) {
        return NextResponse.json(
          { error: "bundle_skus must be an array of strings" },
          { status: 400 }
        );
      }
      const normalized = body.bundle_skus
        .filter((sku): sku is string => typeof sku === "string")
        .map((sku) => sku.trim())
        .filter(Boolean);
      updates.bundle_skus = normalized;
    }

    const { data: existingCollectionState } = await admin
      .from("products")
      .select("is_collection_hero, bundle_skus")
      .eq("id", id)
      .single();
    const nextIsCollectionHero =
      typeof updates.is_collection_hero === "boolean"
        ? (updates.is_collection_hero as boolean)
        : Boolean(existingCollectionState?.is_collection_hero);
    const nextBundleSkus = Array.isArray(updates.bundle_skus)
      ? (updates.bundle_skus as string[])
      : ((existingCollectionState?.bundle_skus as string[] | null) ?? []);

    if (nextIsCollectionHero && nextBundleSkus.length === 0) {
      return NextResponse.json(
        { error: "bundle_skus is required when is_collection_hero is true" },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

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
