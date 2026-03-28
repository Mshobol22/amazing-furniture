import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProductRow = Record<string, unknown> & { id: string };

function passesBaseFilters(row: ProductRow): boolean {
  if (row.in_stock !== true) return false;
  const images = row.images as string[] | null | undefined;
  if (!Array.isArray(images) || images.length === 0) return false;
  const validated = row.images_validated;
  if (validated === false) return false;
  return true;
}

function applyPhaseFilter(
  row: ProductRow,
  context: "brand" | "category",
  contextValue: string,
  phase: "1" | "2",
  filterValue: string | null
): boolean {
  const manufacturer = row.manufacturer != null ? String(row.manufacturer) : "";
  const category = row.category != null ? String(row.category) : "";

  if (phase === "1") {
    if (context === "brand") {
      if (manufacturer !== contextValue) return false;
      if (filterValue && category !== filterValue) return false;
      return true;
    }
    if (category !== contextValue) return false;
    if (filterValue && manufacturer !== filterValue) return false;
    return true;
  }

  if (context === "brand") {
    return manufacturer !== contextValue;
  }
  return category !== contextValue;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const context = sp.get("context");
    const contextValue = sp.get("context_value")?.trim() ?? "";

    if (!context || (context !== "brand" && context !== "category")) {
      return NextResponse.json(
        { error: "context must be 'brand' or 'category'" },
        { status: 400 }
      );
    }
    if (!contextValue) {
      return NextResponse.json(
        { error: "context_value is required" },
        { status: 400 }
      );
    }

    const filterRaw = sp.get("filter_value");
    const filterValue =
      filterRaw != null && filterRaw.trim() !== "" ? filterRaw.trim() : null;

    const phaseRaw = sp.get("phase") ?? "1";
    if (phaseRaw !== "1" && phaseRaw !== "2") {
      return NextResponse.json(
        { error: "phase must be '1' or '2'" },
        { status: 400 }
      );
    }
    const phase = phaseRaw as "1" | "2";

    const cursorParsed = parseIntParam(sp.get("cursor"), { fallback: 0, min: 0 });
    const limitRaw = sp.get("limit");
    const limitParsed = parseIntParam(limitRaw, {
      fallback: 20,
      min: 1,
      max: 50,
      strict: true,
    });
    const seedParam = sp.get("seed");
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
      return NextResponse.json({ error: "cursor must be numeric" }, { status: 400 });
    }
    if (seedParam != null && seedParsed.invalid) {
      return NextResponse.json({ error: "seed must be numeric" }, { status: 400 });
    }

    const cursor = cursorParsed.value;
    const limit = limitParsed.value;
    const seed = seedParsed.value;

    const firstProductIdRaw = sp.get("first_product_id");
    let firstProductId: string | null = null;
    if (firstProductIdRaw != null && firstProductIdRaw.trim() !== "") {
      const tid = firstProductIdRaw.trim();
      if (!UUID_RE.test(tid)) {
        return NextResponse.json(
          { error: "first_product_id must be a valid UUID" },
          { status: 400 }
        );
      }
      firstProductId = tid;
    }

    const supabase = getAnonClient();
    // Full rows for reel display (UF page_id, bundle_skus, page_features, description, etc.)
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("in_stock", true)
      .not("images", "is", null)
      .not("images", "eq", "{}")
      .or("images_validated.eq.true,images_validated.is.null");

    if (error) throw error;

    const allRows = (data ?? []) as ProductRow[];
    const matching = allRows.filter(
      (row) =>
        passesBaseFilters(row) &&
        applyPhaseFilter(row, context as "brand" | "category", contextValue, phase, filterValue)
    );

    const orderedRest = matching.filter((row) => row.id !== firstProductId);
    orderedRest.sort((a, b) => {
      const diff = seededSortValue(String(a.id), seed) - seededSortValue(String(b.id), seed);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });

    let pinRow: ProductRow | null = null;
    if (firstProductId && cursor === 0) {
      const { data: pinData } = await supabase
        .from("products")
        .select("*")
        .eq("id", firstProductId)
        .maybeSingle();
      if (pinData) {
        pinRow = pinData as ProductRow;
      }
    }

    let combined: ProductRow[];
    if (pinRow && cursor === 0) {
      combined = [pinRow, ...orderedRest];
    } else {
      combined = orderedRest;
    }

    const total = combined.length;
    const paged = combined.slice(cursor, cursor + limit);
    const nextOffset = cursor + paged.length;
    const hasMore = nextOffset < total;

    return NextResponse.json({
      products: paged.map((row) => mapRowToProduct(row)),
      nextCursor: hasMore ? nextOffset : null,
      hasMore,
      phase,
      total,
    });
  } catch (err) {
    console.error("Contextual reel route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
