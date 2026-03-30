import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("on_sale", true)
      .limit(1);

    if (error) {
      return NextResponse.json({ hasActiveSaleProducts: false }, { status: 200 });
    }

    return NextResponse.json(
      { hasActiveSaleProducts: (count ?? 0) > 0 },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch {
    return NextResponse.json({ hasActiveSaleProducts: false }, { status: 200 });
  }
}
