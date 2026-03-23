import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const name = body.name as string;
    const slug = (body.slug as string) || slugify(name);
    const price = Number(body.price);
    const category = body.category as string;
    const images = (body.images as string[]) ?? [];
    const description = (body.description as string) || "";

    if (!name || isNaN(price) || !category) {
      return NextResponse.json(
        { error: "Name, price, and category are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("products").insert({
      name,
      slug,
      description,
      price,
      category,
      images,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Admin product create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
