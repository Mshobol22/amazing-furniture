import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Stripe webhook handler - to be implemented
  return NextResponse.json({ received: true });
}
