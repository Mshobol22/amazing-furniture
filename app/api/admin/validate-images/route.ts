import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BATCH_SIZE = 75;

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

  const rawOffset = request.nextUrl.searchParams.get("offset");
  const parsedOffset = Number(rawOffset ?? "0");
  const offset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0
      ? Math.floor(parsedOffset)
      : 0;

  const admin = createAdminClient();

  const { count: totalProducts } = await admin
    .from("products")
    .select("id", { count: "exact", head: true });

  // Process a fixed-size page to keep each invocation fast.
  const { data: products, error: fetchError } = await admin
    .from("products")
    .select("id, images, images_validated")
    .order("id", { ascending: true })
    .range(offset, offset + BATCH_SIZE - 1);

  if (fetchError) {
    console.error("validate-images fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }

  let allValid = 0;
  let partialFixed = 0;
  let fullyBroken = 0;

  for (const product of products ?? []) {
    if (product.images_validated !== null) continue;
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

  const { count: remainingUnchecked } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("images_validated", null)
    .not("images", "is", null)
    .filter("images", "neq", "{}");

  const rowsReturned = (products ?? []).length;
  const reachedEnd = rowsReturned < BATCH_SIZE || offset + rowsReturned >= (totalProducts ?? 0);
  const nextOffset = reachedEnd ? null : offset + BATCH_SIZE;

  return NextResponse.json({
    processed: rowsReturned,
    allValid,
    partialFixed,
    fullyBroken,
    remaining: remainingUnchecked ?? 0,
    nextOffset,
    totalProducts: totalProducts ?? 0,
  });
}
