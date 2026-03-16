import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generic response — never confirm or deny whether email was saved
const OK = NextResponse.json({ ok: true });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return OK;
  }

  const email =
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : "";

  const source =
    typeof (body as Record<string, unknown>).source === "string"
      ? ((body as Record<string, unknown>).source as string).slice(0, 50)
      : "footer";

  // 1. Server-side email format validation
  if (!email || !EMAIL_REGEX.test(email)) {
    return OK;
  }

  const admin = createAdminClient();

  // 2. Log this attempt for rate limiting (fire-and-forget to avoid delay)
  await admin.from("newsletter_attempts").insert({ email });

  // 3. Rate limit: 3+ attempts from the same email in the last hour → silent 200
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("newsletter_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("attempted_at", oneHourAgo);

  if ((count ?? 0) > 3) {
    return OK;
  }

  // 4. Check for duplicate — silent 200, no enumeration
  const { data: existing } = await admin
    .from("newsletter_subscribers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return OK;
  }

  // 5. Insert new subscriber
  const { error: insertError } = await admin
    .from("newsletter_subscribers")
    .insert({ email, source, is_active: true });

  if (insertError) {
    // Log failure without exposing email
    console.error("newsletter insert error:", insertError.code);
    return OK;
  }

  // 6. Send welcome email — failure must never fail the subscription
  try {
    await sendWelcomeEmail(email);
  } catch (err) {
    console.error("welcome email failed:", (err as Error).message);
  }

  return OK;
}
