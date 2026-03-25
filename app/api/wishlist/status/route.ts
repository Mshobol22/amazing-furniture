import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ wishlisted: false });
    }

    const idsParam = request.nextUrl.searchParams.get("product_ids") ?? "";
    const requestedIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (requestedIds.length === 0) {
      return NextResponse.json({ wishlisted: [] as string[] });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id)
      .in("product_id", requestedIds);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      wishlisted: (data ?? [])
        .map((row) => row.product_id as string)
        .filter((id) => requestedIds.includes(id)),
    });
  } catch (error) {
    console.error("Wishlist status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
