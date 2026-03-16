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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const patch: Record<string, unknown> = {};

    if (body.headline !== undefined) {
      const h = body.headline?.trim();
      if (!h) return NextResponse.json({ error: "Title is required" }, { status: 400 });
      if (h.length > 200) return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
      patch.headline = h;
    }
    if (body.subheading !== undefined) {
      patch.subheading = body.subheading?.trim() || null;
    }
    if (body.cta_label !== undefined) {
      patch.cta_label = body.cta_label?.trim() || "Shop Now";
    }
    if (body.cta_href !== undefined) {
      patch.cta_href = body.cta_href?.trim() || "/collections/all";
    }
    if (body.image_url !== undefined) {
      const url = body.image_url?.trim();
      if (!url) return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
      if (!isValidUrl(url)) return NextResponse.json({ error: "Image URL must be a valid http/https URL" }, { status: 400 });
      patch.image_url = url;
    }
    if (body.is_active !== undefined) {
      patch.is_active = Boolean(body.is_active);
    }
    if (body.sort_order !== undefined) {
      const s = Number(body.sort_order);
      if (!Number.isInteger(s) || s < 0) {
        return NextResponse.json({ error: "Sort order must be a non-negative integer" }, { status: 400 });
      }
      patch.sort_order = s;
    }

    // Product link
    if (body.product_slug !== undefined) {
      const admin = createAdminClient();
      if (body.product_slug?.trim()) {
        const { data: prod } = await admin
          .from("products")
          .select("slug, name")
          .eq("slug", body.product_slug.trim())
          .single();
        if (!prod) {
          return NextResponse.json({ error: "Product slug not found" }, { status: 400 });
        }
        patch.product_slug = prod.slug as string;
        patch.product_name = body.product_name?.trim() || (prod.name as string);
      } else {
        patch.product_slug = null;
        patch.product_name = null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("hero_slides")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Slide update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Slide PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    // Verify row belongs to hero_slides before deleting
    const { data: existing } = await admin
      .from("hero_slides")
      .select("id")
      .eq("id", id)
      .single();
    if (!existing) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    const { error } = await admin.from("hero_slides").delete().eq("id", id);
    if (error) {
      console.error("Slide delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Slide DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
