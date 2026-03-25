import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const productId = body?.product_id;
    if (typeof productId !== "string" || productId.trim().length === 0) {
      return NextResponse.json(
        { error: "product_id must be a non-empty string" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existing, error: findError } = await admin
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      const { error: deleteError } = await admin
        .from("wishlists")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        throw deleteError;
      }

      return NextResponse.json({ wishlisted: false });
    }

    const { error: insertError } = await admin.from("wishlists").insert({
      user_id: user.id,
      product_id: productId,
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ wishlisted: true });
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
