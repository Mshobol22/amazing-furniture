import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function checkUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  // Auth check — must be admin before any DB operation
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body gracefully — default to limit 200
  let limit = 200;
  try {
    const body = await request.json();
    if (typeof body?.limit === "number" && body.limit > 0) {
      limit = body.limit;
    }
  } catch {
    // Empty or invalid body — use default
  }

  // Clamp to safe batch range for Vercel function runtime.
  limit = Math.min(Math.max(Math.floor(limit), 1), 500);

  const admin = createAdminClient();

  // Fetch products with unvalidated images
  const { data: products, error: fetchError } = await admin
    .from("products")
    .select("id, images")
    .is("images_validated", null)
    .not("images", "is", null)
    .filter("images", "neq", "{}")
    .limit(limit);

  if (fetchError) {
    console.error("validate-images fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }

  let allValid = 0;
  let partialFixed = 0;
  let fullyBroken = 0;

  for (const product of products ?? []) {
    const urls: string[] = product.images ?? [];
    if (urls.length === 0) continue;

    const results = await Promise.all(urls.map((url) => checkUrl(url)));
    const validUrls = urls.filter((_, i) => results[i]);

    if (validUrls.length === urls.length) {
      // All URLs valid
      await admin
        .from("products")
        .update({ images_validated: true })
        .eq("id", product.id);
      allValid++;
    } else if (validUrls.length > 0) {
      // Some broken — remove broken URLs, keep valid ones
      await admin
        .from("products")
        .update({ images: validUrls, images_validated: true })
        .eq("id", product.id);
      partialFixed++;
    } else {
      // All URLs broken — mark false, keep original for admin review
      await admin
        .from("products")
        .update({ images_validated: false })
        .eq("id", product.id);
      fullyBroken++;
    }
  }

  // Count remaining unvalidated products
  const { count: remaining } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("images_validated", null)
    .not("images", "is", null)
    .filter("images", "neq", "{}");

  return NextResponse.json({
    processed: (products ?? []).length,
    allValid,
    partialFixed,
    fullyBroken,
    remaining: remaining ?? 0,
  });
}
