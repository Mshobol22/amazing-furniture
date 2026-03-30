import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ValidateBody = {
  code?: string;
  email?: string;
};

export async function POST(request: NextRequest) {
  let body: ValidateBody;
  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!code || !email) {
    return NextResponse.json(
      { error: "Code and email are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: discountRow, error: codeError } = await admin
    .from("discount_codes")
    .select("code, discount_percent")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (codeError || !discountRow) {
    return NextResponse.json(
      { error: "Invalid or expired discount code" },
      { status: 404 }
    );
  }

  const { data: existingRedemption, error: redemptionError } = await admin
    .from("discount_redemptions")
    .select("id")
    .eq("code", code)
    .eq("email", email)
    .maybeSingle();

  if (redemptionError) {
    return NextResponse.json(
      { error: "Unable to validate discount code" },
      { status: 500 }
    );
  }

  if (existingRedemption) {
    return NextResponse.json(
      { error: "This code has already been used with this email" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    valid: true,
    discountPercent: discountRow.discount_percent,
    code: discountRow.code,
  });
}
