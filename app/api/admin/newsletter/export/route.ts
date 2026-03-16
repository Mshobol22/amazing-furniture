import { NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Admin auth verified server-side
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Only export active subscribers
  const { data, error } = await admin
    .from("newsletter_subscribers")
    .select("email, subscribed_at, source")
    .eq("is_active", true)
    .order("subscribed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build CSV server-side — never exposes full list in a single unprotected client response
  const rows = (data ?? []).map((row) => {
    const escapedEmail = `"${row.email.replace(/"/g, '""')}"`;
    const date = new Date(row.subscribed_at).toISOString().slice(0, 10);
    return `${escapedEmail},${date},${row.source}`;
  });

  const csv = ["email,subscribed_at,source", ...rows].join("\n");
  const filename = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
