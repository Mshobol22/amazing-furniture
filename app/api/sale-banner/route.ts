import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE =
  "public, s-maxage=60, stale-while-revalidate=300";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sale_events")
      .select(
        "name, discount_label, banner_headline, badge_text, badge_color, slug"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { active: false as const },
        { status: 200, headers: { "Cache-Control": CACHE } }
      );
    }

    return NextResponse.json(
      {
        active: true as const,
        name: data.name,
        discount_label: data.discount_label,
        banner_headline: data.banner_headline,
        badge_text: data.badge_text,
        badge_color: data.badge_color,
        slug: data.slug,
      },
      { status: 200, headers: { "Cache-Control": CACHE } }
    );
  } catch {
    return NextResponse.json(
      { active: false as const },
      { status: 200, headers: { "Cache-Control": CACHE } }
    );
  }
}
