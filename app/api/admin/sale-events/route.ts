import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && isAdmin(user);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sale_events")
    .select("id, name, slug, description, sale_type, badge_text, badge_color, banner_headline, banner_subtext, discount_label, start_date, end_date, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = String(body.slug ?? "").trim() || slugify(name);

  const payload = {
    name,
    slug,
    description: body.description ? String(body.description) : null,
    sale_type: String(body.sale_type ?? "other"),
    badge_text: body.badge_text ? String(body.badge_text) : null,
    badge_color: String(body.badge_color ?? "#2D4A3E"),
    banner_headline: body.banner_headline ? String(body.banner_headline) : null,
    banner_subtext: body.banner_subtext ? String(body.banner_subtext) : null,
    discount_label: body.discount_label ? String(body.discount_label) : null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    is_active: Boolean(body.is_active),
    sort_order: Number(body.sort_order) || 0,
  };

  const { data, error } = await admin
    .from("sale_events")
    .insert(payload)
    .select("id, name, slug, description, sale_type, badge_text, badge_color, banner_headline, banner_subtext, discount_label, start_date, end_date, is_active, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ event: data });
}
