import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { getAllSettingsMasked, setSetting } from "@/lib/settings-store";

const ALLOWED_KEYS = new Set([
  "united_email",
  "united_password",
  "united_csv_url",
  "nfd_email",
  "nfd_password",
  "nfd_csv_url",
]);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAllSettingsMasked();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Admin settings GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { key?: string; value?: string };
    const key = body?.key ?? "";
    const value = body?.value ?? "";

    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    await setSetting(key, value, user.email ?? "");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin settings POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
