import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  batchUpsertProducts,
  parseCSVStream,
  validateCronSecret,
} from "@/lib/cron-utils";
import type { Product } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSERT_BATCH_SIZE = 100;

function asHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function defaultLoginUrl(csvUrl: string): string {
  const origin = new URL(csvUrl).origin;
  return `${origin}/login`;
}

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.NFD_PORTAL_EMAIL;
  const password = process.env.NFD_PORTAL_PASSWORD;
  const csvUrl = process.env.NFD_PORTAL_CSV_URL;

  if (!email || !password || !csvUrl) {
    console.warn("[sync-nfd] NFD credentials not configured - skipping");
    return NextResponse.json({
      message: "NFD credentials not configured — skipping",
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    });
  }

  const loginUrl = process.env.NFD_PORTAL_LOGIN_URL ?? defaultLoginUrl(csvUrl);
  const supabase = createAdminClient();
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let updated = 0;
  const pending: Partial<Product>[] = [];

  async function flushPending() {
    if (pending.length === 0) return;
    const result = await batchUpsertProducts(supabase, pending, UPSERT_BATCH_SIZE);
    updated += result.updated;
    errors += result.errors;
    pending.length = 0;
  }

  try {
    const loginBody = new URLSearchParams({ email, password });
    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: loginBody.toString(),
      redirect: "manual",
      cache: "no-store",
    });

    const cookie = loginRes.headers.get("set-cookie");
    if (!cookie) {
      throw new Error("NFD login did not return a session cookie");
    }

    const csvRes = await fetch(csvUrl, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!csvRes.ok) {
      throw new Error(`Failed to download NFD CSV: ${csvRes.status}`);
    }

    await parseCSVStream(csvRes, async (row) => {
      processed += 1;

      try {
        const sku = String(row["itemCode"] ?? "").trim();
        if (!sku) {
          skipped += 1;
          return;
        }

        const qty = toNumber(row["itemQuantityInStock"]);
        const itemPrice = toNumber(row["itemPrice"]);
        const image = asHttpsUrl(row["itemGroupImage"]);

        const { data: existing, error } = await supabase
          .from("products")
          .select("sku, in_stock, price, images")
          .eq("sku", sku)
          .maybeSingle();

        if (error) {
          errors += 1;
          console.error("[sync-nfd] lookup error:", error.message, { sku });
          return;
        }

        if (!existing) {
          skipped += 1;
          return;
        }

        const patch: Partial<Product> = { sku };
        let changed = false;

        if (qty != null) {
          const inStock = qty > 0;
          if (existing.in_stock !== inStock) {
            patch.in_stock = inStock;
            changed = true;
          }
        }

        if (itemPrice != null) {
          const newPrice = round2(itemPrice * 2.2);
          const currentPrice = Number(existing.price);
          if (!Number.isFinite(currentPrice) || Math.abs(currentPrice - newPrice) > 0.005) {
            patch.price = newPrice;
            changed = true;
          }
        }

        if (image) {
          const currentImages = Array.isArray(existing.images) ? [...existing.images] : [];
          const currentLead = typeof currentImages[0] === "string" ? currentImages[0] : null;
          if (currentLead !== image) {
            if (currentImages.length === 0) currentImages.push(image);
            else currentImages[0] = image;
            patch.images = currentImages;
            changed = true;
          }
        }

        if (!changed) {
          skipped += 1;
          return;
        }

        pending.push(patch);
        if (pending.length >= UPSERT_BATCH_SIZE) {
          await flushPending();
        }
      } catch (err) {
        errors += 1;
        console.error("[sync-nfd] row processing error:", err);
      }
    });

    await flushPending();

    const summary = { processed, updated, skipped, errors };
    console.log("[sync-nfd] summary:", summary);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[sync-nfd] fatal error:", err);
    return NextResponse.json(
      { error: "NFD sync failed", processed, updated, skipped, errors: errors + 1 },
      { status: 500 }
    );
  }
}
