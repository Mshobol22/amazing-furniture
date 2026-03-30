import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rawEmail =
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, unknown>).email as string)
      : "";
  const email = rawEmail.trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    await admin.from("newsletter_subscribers").upsert(
      {
        email,
        source: "idle_popup",
        is_active: true,
      },
      { onConflict: "email" }
    );

    return NextResponse.json({
      success: true,
      code: "WELCOME10",
      discountPercent: 10,
    });
  } catch (error) {
    console.error("idle-discount error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
