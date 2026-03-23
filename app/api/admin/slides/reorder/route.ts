import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { order } = body; // Array of { id: string, sort_order: number }

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: "order must be a non-empty array" }, { status: 400 });
    }

    for (const item of order) {
      if (typeof item.id !== "string" || !item.id.trim()) {
        return NextResponse.json({ error: "Each item must have a valid id" }, { status: 400 });
      }
      if (typeof item.sort_order !== "number" || !Number.isInteger(item.sort_order) || item.sort_order < 0) {
        return NextResponse.json({ error: "Each sort_order must be a non-negative integer" }, { status: 400 });
      }
    }

    const admin = createAdminClient();

    // Verify all IDs exist in hero_slides before updating
    const ids = order.map((o: { id: string }) => o.id);
    const { data: existing } = await admin
      .from("hero_slides")
      .select("id")
      .in("id", ids);

    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
    for (const id of ids) {
      if (!existingIds.has(id)) {
        return NextResponse.json({ error: `Slide id ${id} not found` }, { status: 400 });
      }
    }

    // Update each slide's sort_order
    await Promise.all(
      order.map((item: { id: string; sort_order: number }) =>
        admin
          .from("hero_slides")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id)
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Slides reorder error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
