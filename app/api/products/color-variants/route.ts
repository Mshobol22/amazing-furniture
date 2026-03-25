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

const IMAGE_OR_FILTER =
  "images_validated.eq.true,and(images_validated.is.null,images.not.is.null,images.neq.{})";

export async function GET(request: NextRequest) {
  try {
    const designNumber = request.nextUrl.searchParams.get("design_number")?.trim() ?? "";
    const manufacturer = request.nextUrl.searchParams.get("manufacturer")?.trim() ?? "";
    const excludeId = request.nextUrl.searchParams.get("exclude_id")?.trim() ?? "";

    if (!designNumber || !manufacturer) {
      return NextResponse.json({ variants: [] });
    }

    if (!/^\d+$/.test(designNumber)) {
      return NextResponse.json({ variants: [] });
    }

    const supabase = getAnonClient();

    let query = supabase
      .from("products")
      .select("*")
      .eq("manufacturer", manufacturer)
      .like("sku", `${designNumber}-%`)
      .or(IMAGE_OR_FILTER)
      .order("color", { ascending: true, nullsFirst: false });

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("color-variants query error:", error);
      return NextResponse.json({ variants: [] });
    }

    const variants = (data ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    );

    return NextResponse.json({ variants });
  } catch (err) {
    console.error("color-variants route error:", err);
    return NextResponse.json({ variants: [] });
  }
}
