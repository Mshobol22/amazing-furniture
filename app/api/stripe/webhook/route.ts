import { NextResponse } from "next/server";

// ⚠️  This path is not registered in Stripe — the active webhook handler
// is at /api/webhooks/stripe. This stub exists only to prevent 404s if
// Stripe is ever misconfigured to point here.
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
