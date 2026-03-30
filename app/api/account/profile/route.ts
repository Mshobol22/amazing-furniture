import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfilePayload = {
  fullName?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

function clean(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, address_line1, city, state, zip, country")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProfilePayload;
  const payload = {
    user_id: user.id,
    full_name: clean(body.fullName, 120),
    email: clean(body.email, 160),
    address_line1: clean(body.addressLine1, 200),
    city: clean(body.city, 120),
    state: clean(body.state, 120),
    zip: clean(body.zip, 30),
    country: clean(body.country, 120) ?? "US",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
  if (error) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

