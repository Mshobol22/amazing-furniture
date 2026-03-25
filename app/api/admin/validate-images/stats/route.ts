import { NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [validRes, brokenRes, uncheckedRes] = await Promise.all([
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("images_validated", true),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("images_validated", false),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("images_validated", null),
  ]);

  return NextResponse.json({
    valid: validRes.count ?? 0,
    broken: brokenRes.count ?? 0,
    unchecked: uncheckedRes.count ?? 0,
  });
}
