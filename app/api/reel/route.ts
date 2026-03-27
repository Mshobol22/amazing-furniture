import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mapRowToProduct } from "@/lib/supabase/products";

export const dynamic = "force-dynamic";

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase anon credentials");
  }

  return createClient(url, anonKey);
}

function parsePositiveInt(input: string | null, fallback: number) {
  if (!input) return fallback;
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  try {
    const collectionGroup = request.nextUrl.searchParams.get("collection_group");
    const rawCategory = request.nextUrl.searchParams.get("category");
    const category = rawCategory?.trim() ?? "";

    if (!collectionGroup) {
      return NextResponse.json(
        { error: "collection_group is required" },
        { status: 400 }
      );
    }

    const offset = parsePositiveInt(
      request.nextUrl.searchParams.get("offset"),
      0
    );
    const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit"), 20);

    const supabase = getAnonClient();

    const imageFilter =
      "images_validated.eq.true,and(images_validated.is.null,images.not.is.null,images.neq.{})";

    const { data: collectionData, error: collectionError } = await supabase
      .from("products")
      .select("*")
      .eq("collection_group", collectionGroup)
      .eq("in_stock", true)
      .or(imageFilter)
      .order("is_collection_hero", { ascending: false })
      .order("piece_type", { ascending: true });

    if (collectionError) {
      throw collectionError;
    }

    let relatedQuery = supabase
      .from("products")
      .select("*")
      .or(`collection_group.is.null,collection_group.neq.${collectionGroup}`)
      .eq("in_stock", true)
      .or(imageFilter)
      .range(offset, offset + limit - 1);

    if (category) {
      relatedQuery = relatedQuery.eq("category", category);
    }

    const { data: relatedData, error: relatedError } = await relatedQuery;

    if (relatedError) {
      throw relatedError;
    }

    const relatedProducts = (relatedData ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    );

    return NextResponse.json({
      collectionPieces: (collectionData ?? []).map((row) =>
        mapRowToProduct(row as Record<string, unknown>)
      ),
      relatedProducts,
      nextOffset: offset + relatedProducts.length,
      hasMore: relatedProducts.length === limit,
    });
  } catch (error) {
    console.error("Reel route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
