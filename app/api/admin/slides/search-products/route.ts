import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) return NextResponse.json([]);

    // Cap query length to prevent abuse
    const safeQ = q.slice(0, 100);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("id, name, slug, images")
      .ilike("name", `%${safeQ}%`)
      .limit(8);

    if (error) {
      console.error("Product search error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: Array.isArray(p.images) ? p.images[0] ?? null : null,
      }))
    );
  } catch (err) {
    console.error("Product search GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
