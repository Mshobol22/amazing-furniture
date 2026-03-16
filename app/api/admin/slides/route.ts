import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Slides fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Slides GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      headline,
      subheading,
      cta_label = "Shop Now",
      cta_href = "/collections/all",
      image_url,
      sort_order,
      is_active = true,
      product_slug,
      product_name,
    } = body;

    // Validate required fields
    if (!headline?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (headline.trim().length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
    }
    if (!image_url?.trim()) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }
    if (!isValidUrl(image_url.trim())) {
      return NextResponse.json({ error: "Image URL must be a valid http/https URL" }, { status: 400 });
    }
    if (sort_order !== undefined && (typeof sort_order !== "number" || !Number.isInteger(sort_order) || sort_order < 0)) {
      return NextResponse.json({ error: "Sort order must be a non-negative integer" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify product_slug exists if provided
    let resolvedProductSlug: string | null = null;
    let resolvedProductName: string | null = null;
    if (product_slug?.trim()) {
      const { data: prod } = await admin
        .from("products")
        .select("slug, name")
        .eq("slug", product_slug.trim())
        .single();
      if (!prod) {
        return NextResponse.json({ error: "Product slug not found in products table" }, { status: 400 });
      }
      resolvedProductSlug = prod.slug as string;
      resolvedProductName = product_name?.trim() || (prod.name as string);
    }

    // Determine sort_order: max + 1 if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const { data: maxRow } = await admin
        .from("hero_slides")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      finalSortOrder = maxRow ? (maxRow.sort_order as number) + 1 : 1;
    }

    const { data, error } = await admin
      .from("hero_slides")
      .insert({
        headline: headline.trim(),
        subheading: subheading?.trim() || null,
        cta_label: cta_label?.trim() || "Shop Now",
        cta_href: cta_href?.trim() || "/collections/all",
        image_url: image_url.trim(),
        sort_order: finalSortOrder,
        is_active: Boolean(is_active),
        product_slug: resolvedProductSlug,
        product_name: resolvedProductName,
      })
      .select()
      .single();

    if (error) {
      console.error("Slide create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Slides POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
