import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Banners fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Banners GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const {
      message,
      bg_color = "#1C1C1C",
      text_color = "#FAF8F5",
      link_url,
      link_text,
      is_active = true,
    } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("banners")
      .insert({
        message: message.trim(),
        bg_color: bg_color || "#1C1C1C",
        text_color: text_color || "#FAF8F5",
        link_url: link_url?.trim() || null,
        link_text: link_text?.trim() || null,
        is_active: Boolean(is_active),
      })
      .select()
      .single();

    if (error) {
      console.error("Banner create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Banner POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
