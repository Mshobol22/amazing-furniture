import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  applyAcmeComponentListingFilter,
  applyZinatexListingVisibilityFilter,
  attachZinatexFromPrices,
  mapRowToProduct,
} from "@/lib/supabase/products";

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

    // select("*") returns all columns needed for reel UI (description, collection_group,
    // piece_type, sku, finish, collection, catalog_size, product_details, page_id,
    // bundle_skus, page_features, subcategory/name for Zinatex, etc.)
    let collectionQuery = supabase
      .from("products")
      .select("*")
      .eq("collection_group", collectionGroup)
      .eq("in_stock", true);
    collectionQuery = applyZinatexListingVisibilityFilter(collectionQuery);
    collectionQuery = applyAcmeComponentListingFilter(collectionQuery);
    collectionQuery = collectionQuery
      .or(imageFilter)
      .order("is_collection_hero", { ascending: false })
      .order("piece_type", { ascending: true });

    const { data: collectionData, error: collectionError } = await collectionQuery;

    if (collectionError) {
      throw collectionError;
    }

    let relatedQuery = supabase
      .from("products")
      .select("*")
      .or(`collection_group.is.null,collection_group.neq.${collectionGroup}`)
      .eq("in_stock", true);
    relatedQuery = applyZinatexListingVisibilityFilter(relatedQuery);
    relatedQuery = applyAcmeComponentListingFilter(relatedQuery);
    relatedQuery = relatedQuery.or(imageFilter).range(offset, offset + limit - 1);

    if (category) {
      relatedQuery = relatedQuery.eq("category", category);
    }

    const { data: relatedData, error: relatedError } = await relatedQuery;

    if (relatedError) {
      throw relatedError;
    }

    const collectionMapped = (collectionData ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    );
    const relatedMapped = (relatedData ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    );
    const [collectionPieces, relatedProducts] = await Promise.all([
      attachZinatexFromPrices(collectionMapped),
      attachZinatexFromPrices(relatedMapped),
    ]);

    return NextResponse.json({
      collectionPieces,
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
