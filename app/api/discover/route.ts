import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  applyZinatexListingVisibilityFilter,
  mapRowToProduct,
} from "@/lib/supabase/products";

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase anon credentials");
  }

  return createClient(url, anonKey);
}

function parseIntParam(
  input: string | null,
  {
    fallback,
    min,
    max,
    strict = false,
  }: { fallback: number; min?: number; max?: number; strict?: boolean }
): { value: number; invalid: boolean } {
  if (input == null || input.trim() === "") {
    return { value: fallback, invalid: false };
  }
  if (strict && !/^-?\d+$/.test(input.trim())) {
    return { value: fallback, invalid: true };
  }
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) {
    return { value: fallback, invalid: true };
  }

  let value = Math.floor(parsed);
  if (min != null && value < min) value = min;
  if (max != null && value > max) value = max;
  return { value, invalid: false };
}

function seededSortValue(id: string, seed: number): number {
  let hash = 0;
  const source = `${id}${seed}`;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash % 9999;
}

export async function GET(request: NextRequest) {
  try {
    const cursorParsed = parseIntParam(request.nextUrl.searchParams.get("cursor"), {
      fallback: 0,
      min: 0,
    });
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limitParsed = parseIntParam(limitRaw, {
      fallback: 20,
      min: 1,
      max: 50,
      strict: true,
    });
    const seedParam = request.nextUrl.searchParams.get("seed");
    const seedParsed = parseIntParam(seedParam, {
      fallback: 0,
      strict: true,
    });

    if (limitParsed.invalid || (limitRaw != null && Number(limitRaw) > 50)) {
      return NextResponse.json(
        { error: "limit must be a numeric value <= 50" },
        { status: 400 }
      );
    }
    if (cursorParsed.invalid) {
      return NextResponse.json(
        { error: "cursor must be numeric" },
        { status: 400 }
      );
    }
    if (seedParam != null && seedParsed.invalid) {
      return NextResponse.json(
        { error: "seed must be numeric" },
        { status: 400 }
      );
    }

    const cursor = cursorParsed.value;
    const limit = limitParsed.value;
    const seed = seedParam == null ? null : seedParsed.value;
    const supabase = getAnonClient();

    // Full row for mapRowToProduct — UF page_id/bundle_skus/page_features/description; Zinatex collection/subcategory/name
    let baseQuery = supabase
      .from("products")
      .select("*")
      .eq("in_stock", true)
      .not("images", "is", null)
      .not("images", "eq", "{}");
    baseQuery = applyZinatexListingVisibilityFilter(baseQuery);
    baseQuery = baseQuery.or("images_validated.eq.true,images_validated.is.null");

    const { data, error } = await baseQuery;
    if (error) throw error;

    const matchingRows =
      (data ?? []).filter((row) => Array.isArray(row.images) && row.images.length > 0);

    const orderedRows = [...matchingRows];
    if (seed == null) {
      orderedRows.sort(() => Math.random() - 0.5);
    } else {
      orderedRows.sort((a, b) => {
        const diff = seededSortValue(String(a.id), seed) - seededSortValue(String(b.id), seed);
        if (diff !== 0) return diff;
        return String(a.id).localeCompare(String(b.id));
      });
    }

    const pagedRows = orderedRows.slice(cursor, cursor + limit);
    const nextCursor = cursor + pagedRows.length;
    const total = orderedRows.length;
    const hasMore = nextCursor < total;

    return NextResponse.json({
      products: pagedRows.map((row) => mapRowToProduct(row as Record<string, unknown>)),
      nextCursor: hasMore ? nextCursor : null,
      hasMore,
      total,
    });
  } catch (error) {
    console.error("Discover route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
