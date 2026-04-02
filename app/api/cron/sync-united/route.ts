import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  batchUpsertProducts,
  parseCSVStream,
  validateCronSecret,
} from "@/lib/cron-utils";
import { getSetting } from "@/lib/settings-store";
import type { Product } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNITED_LOGIN_URL = "https://cms.amptab.com/";
const UNITED_CSV_URL =
  "https://cms.amptab.com/Manufacturer/169382/Shop2DownloadPublication?fileId=1645225683";
const UPSERT_BATCH_SIZE = 100;

function asHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed;
}

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = (await getSetting("united_email")) ?? process.env.UNITED_PORTAL_EMAIL;
  const password = (await getSetting("united_password")) ?? process.env.UNITED_PORTAL_PASSWORD;

  if (!email || !password) {
    console.warn("[sync-united] United credentials not configured - skipping");
    return NextResponse.json({
      message: "United credentials not configured — skipping",
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    });
  }

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
    const loginRes = await fetch(UNITED_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: loginBody.toString(),
      redirect: "manual",
      cache: "no-store",
    });

    const cookie = loginRes.headers.get("set-cookie");
    if (!cookie) {
      throw new Error("United login did not return a session cookie");
    }

    const csvRes = await fetch(UNITED_CSV_URL, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!csvRes.ok) {
      throw new Error(`Failed to download United CSV: ${csvRes.status}`);
    }

    await parseCSVStream(csvRes, async (row) => {
      processed += 1;

      try {
        const sku = String(row["Vendor Sku"] ?? "").trim();
        if (!sku) {
          skipped += 1;
          return;
        }

        const inv1 = toNumber(row["Inventory"]);
        const inv2 = toNumber(row["Inventory 2"]);
        const inv3 = toNumber(row["Inventory 3"]);
        const inv4 = toNumber(row["Inventory 4"]);
        const inv5 = toNumber(row["Inventory 5"]);
        const mapPrice = toNumber(row["MAP"]);
        const itemStatus = String(row["Item Status"] ?? "").trim();
        const image = asHttpsUrl(row["Image Urls"]);

        let inStock = inv1 > 0 || inv2 > 0 || inv3 > 0 || inv4 > 0 || inv5 > 0;
        if (itemStatus.toLowerCase() !== "active") {
          inStock = false;
        }

        const { data: existing, error } = await supabase
          .from("products")
          .select("sku, in_stock, price, images")
          .eq("sku", sku)
          .maybeSingle();

        if (error) {
          errors += 1;
          console.error("[sync-united] lookup error:", error.message, { sku });
          return;
        }

        if (!existing) {
          skipped += 1;
          return;
        }

        const patch: Partial<Product> = { sku };
        let changed = false;

        if (existing.in_stock !== inStock) {
          patch.in_stock = inStock;
          changed = true;
        }

        if (mapPrice > 0) {
          const newPrice = round2(mapPrice);
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
        console.error("[sync-united] row processing error:", err);
      }
    });

    await flushPending();

    const summary = { processed, updated, skipped, errors };
    console.log("[sync-united] summary:", summary);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[sync-united] fatal error:", err);
    return NextResponse.json(
      { error: "United sync failed", processed, updated, skipped, errors: errors + 1 },
      { status: 500 }
    );
  }
}
