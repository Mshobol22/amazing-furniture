import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyAcmeComponentListingFilter,
  mapRowToProduct,
} from "@/lib/supabase/products";
import type { Product, ProductVariant } from "@/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IMAGE_OR_FILTER =
  "images_validated.eq.true,and(images_validated.is.null,images.not.is.null,images.neq.{})";

function mapPgVariant(row: Record<string, unknown>): ProductVariant {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    sku: String(row.sku),
    size: row.size != null ? String(row.size) : null,
    color: row.color != null ? String(row.color) : null,
    price: Number(row.price),
    compare_at_price:
      row.compare_at_price != null ? Number(row.compare_at_price) : null,
    stock_qty: Number(row.stock_qty ?? 0),
    in_stock: Boolean(row.in_stock),
    image_url: row.image_url != null ? String(row.image_url) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

/** Reel slide: parent identity + variant visuals/pricing; cart uses `zinatex_reel_variant`. */
function zinatexReelProductFromVariant(
  parent: Product,
  v: ProductVariant
): Product {
  const lead =
    v.image_url?.startsWith("https://") && v.image_url.length > 0
      ? v.image_url
      : (parent.images[0] ?? "");
  const images = lead ? [lead] : [...parent.images];
  return {
    ...parent,
    price: v.price,
    compare_price: v.compare_at_price ?? undefined,
    color: v.color,
    sku: v.sku,
    images,
    in_stock: v.in_stock,
    zinatex_reel_variant: v,
  };
}

export async function GET(request: NextRequest) {
  try {
    const parentId = request.nextUrl.searchParams.get("parent_id")?.trim() ?? "";

    if (parentId && UUID_RE.test(parentId)) {
      const supabase = createAdminClient();
      const { data: parentRow, error: parentErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", parentId)
        .maybeSingle();

      if (parentErr || !parentRow) {
        return NextResponse.json({ variants: [] });
      }

      const parent = mapRowToProduct(parentRow as Record<string, unknown>);
      if (parent.manufacturer !== "Zinatex" || parent.has_variants !== true) {
        return NextResponse.json({ variants: [] });
      }

      const { data: rows, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", parentId)
        .order("sort_order", { ascending: true, nullsFirst: true })
        .order("color", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("color-variants product_variants error:", error);
        return NextResponse.json({ variants: [] });
      }

      const slideProducts = (rows ?? []).map((r) =>
        zinatexReelProductFromVariant(parent, mapPgVariant(r as Record<string, unknown>))
      );

      // One horizontal reel slide per distinct color (prefer in-stock for image/price).
      slideProducts.sort((a, b) => {
        if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
        const ca = a.color ?? "";
        const cb = b.color ?? "";
        return ca.localeCompare(cb);
      });

      const seen = new Set<string>();
      const deduped: Product[] = [];
      for (const p of slideProducts) {
        const key = p.color ?? p.sku ?? p.id;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(p);
      }

      return NextResponse.json({ variants: deduped });
    }

    // Legacy: separate product rows keyed by numeric design prefix on SKU
    const designNumber =
      request.nextUrl.searchParams.get("design_number")?.trim() ?? "";
    const manufacturer =
      request.nextUrl.searchParams.get("manufacturer")?.trim() ?? "";
    const excludeId = request.nextUrl.searchParams.get("exclude_id")?.trim() ?? "";

    if (!designNumber || !manufacturer) {
      return NextResponse.json({ variants: [] });
    }

    if (!/^\d+$/.test(designNumber)) {
      return NextResponse.json({ variants: [] });
    }

    const supabase = createAdminClient();

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

    query = applyAcmeComponentListingFilter(query);

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
