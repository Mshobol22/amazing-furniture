import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  batchUpsertVariants,
  parseCSVStream,
  validateCronSecret,
} from "@/lib/cron-utils";
import type { ProductVariant } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZINATEX_CSV_URL =
  "https://zinatexrugs.com/wp-content/uploads/woo-feed/custom/csv/zinatexproductfeed.csv";
const UPSERT_BATCH_SIZE = 100;
const SIZE_ORDER: Record<string, number> = {
  "2x4": 1,
  "2x8": 2,
  "4x6": 3,
  "5x8": 4,
  "7ft Round": 5,
  "7x10": 6,
  "8x11": 7,
  "10x13": 8,
};

type ZinatexRow = Record<string, string>;

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

function normalizeSize(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "7ftround") return "7ft Round";
  return trimmed;
}

function getSizeFromVariationSku(variationSku: string): string | null {
  const parts = variationSku.split("-").filter(Boolean);
  if (parts.length === 0) return null;
  return normalizeSize(parts[parts.length - 1] ?? null);
}

function buildVariantRow(
  row: ZinatexRow,
  productId: string
): Partial<ProductVariant> | null {
  const sku = String(row["Variation SKU"] ?? "").trim();
  if (!sku) return null;

  const qtyRaw = toNumber(row["QUANTITY ON HAND"]);
  const qty = qtyRaw == null ? 0 : Math.max(0, Math.trunc(qtyRaw));
  const msrp = toNumber(row["RETAIL PRICE / MSRP"]);
  const size = getSizeFromVariationSku(sku);
  const normalizedSize = normalizeSize(size);
  const image = asHttpsUrl(row["MAIN IMAGE"]);
  const color = String(row["COLOR"] ?? "").trim() || null;

  return {
    product_id: productId,
    sku,
    size: normalizedSize,
    color,
    price: msrp == null ? 0 : round2((msrp / 4) * 2.2),
    in_stock: qty > 0,
    stock_qty: qty,
    image_url: image,
    sort_order: SIZE_ORDER[normalizedSize ?? ""] ?? 99,
  };
}

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = Date.now();
  let processed = 0;
  let singlesUpdated = 0;
  let variantsUpdated = 0;
  let promoted = 0;
  let skippedNoMatch = 0;
  let errors = 0;

  try {
    const response = await fetch(ZINATEX_CSV_URL, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      console.error(
        `[sync-zinatex] CSV fetch failed: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: "CSV unavailable", status: response.status },
        { status: 200 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/") &&
      !contentType.includes("csv") &&
      !contentType.includes("octet-stream")
    ) {
      const preview = await response.text();
      console.error(
        `[sync-zinatex] Unexpected content-type: ${contentType}. Body preview: ${preview.slice(0, 300)}`
      );
      return NextResponse.json(
        { error: "Unexpected content type", contentType },
        { status: 200 }
      );
    }

    const rows: ZinatexRow[] = [];
    await parseCSVStream(response, async (row) => {
      processed += 1;
      rows.push(row);
    });

    const parentGroups = new Map<string, ZinatexRow[]>();
    for (const row of rows) {
      try {
        const parentSku = String(row["Parent SKU"] ?? "").trim();
        const variationSku = String(row["Variation SKU"] ?? "").trim();
        const key = parentSku || variationSku;
        if (!key) continue;
        if (!parentGroups.has(key)) parentGroups.set(key, []);
        parentGroups.get(key)!.push(row);
      } catch (err) {
        errors += 1;
        console.error("[sync-zinatex] grouping error:", err);
      }
    }

    for (const [parentSku, groupRows] of parentGroups) {
      try {
        const variationSkus = groupRows
          .map((r) => String(r["Variation SKU"] ?? "").trim())
          .filter(Boolean);

        if (variationSkus.length === 0) {
          skippedNoMatch += 1;
          console.log(`[SKIP] Parent SKU: ${parentSku} — no variation SKUs in CSV group`);
          continue;
        }

        const { data: parentProduct, error: parentLookupError } = await supabase
          .from("products")
          .select("id, sku, has_variants, images, collection")
          .eq("manufacturer", "Zinatex")
          .in("sku", variationSkus)
          .limit(1)
          .maybeSingle();

        if (parentLookupError) {
          errors += 1;
          console.error("[sync-zinatex] parent lookup error:", parentLookupError.message, {
            parentSku,
          });
          continue;
        }

        if (!parentProduct) {
          skippedNoMatch += 1;
          console.log(
            `[SKIP] Parent SKU: ${parentSku} — no matching product in DB, needs manual import`
          );
          continue;
        }

        if (groupRows.length === 1) {
          const row = groupRows[0];
          const qty = toNumber(row["QUANTITY ON HAND"]);
          const msrp = toNumber(row["RETAIL PRICE / MSRP"]);
          const image = asHttpsUrl(row["MAIN IMAGE"]);

          const patch: {
            in_stock?: boolean;
            price?: number;
            images?: string[];
          } = {};

          if (qty != null) patch.in_stock = qty > 0;
          if (msrp != null) patch.price = round2((msrp / 4) * 2.2);
          if (image) {
            const currentImages = Array.isArray(parentProduct.images)
              ? [...parentProduct.images]
              : [];
            if (currentImages.length === 0) currentImages.push(image);
            else currentImages[0] = image;
            patch.images = currentImages;
          }

          if (Object.keys(patch).length > 0) {
            const { error: updateError } = await supabase
              .from("products")
              .update(patch)
              .eq("id", parentProduct.id);
            if (updateError) {
              errors += 1;
              console.error("[sync-zinatex] single update error:", updateError.message, {
                sku: parentProduct.sku,
              });
            } else {
              singlesUpdated += 1;
              console.log(`[SINGLE] ${parentProduct.sku} — updated in_stock + price`);
            }
          }
          continue;
        }

        if (parentProduct.has_variants) {
          const variantRows = groupRows
            .map((row) => buildVariantRow(row, parentProduct.id))
            .filter((row): row is Partial<ProductVariant> => row != null);

          const result = await batchUpsertVariants(supabase, variantRows, UPSERT_BATCH_SIZE);
          variantsUpdated += result.updated;
          errors += result.errors;
          console.log(
            `[VARIANT-UPDATE] ${parentSku} — ${variantRows.length} variants upserted`
          );
          continue;
        }

        const { error: promoteError } = await supabase
          .from("products")
          .update({ has_variants: true, variant_type: "rug" })
          .eq("id", parentProduct.id);
        if (promoteError) {
          errors += 1;
          console.error("[sync-zinatex] promotion product update error:", promoteError.message, {
            sku: parentProduct.sku,
          });
          continue;
        }

        const promotedVariantRows = groupRows
          .map((row) => buildVariantRow(row, parentProduct.id))
          .filter((row): row is Partial<ProductVariant> => row != null);

        const promoteResult = await batchUpsertVariants(
          supabase,
          promotedVariantRows,
          UPSERT_BATCH_SIZE
        );
        errors += promoteResult.errors;
        promoted += 1;
        console.log(
          `[PROMOTED] ${parentProduct.sku} → has_variants=true, ${promotedVariantRows.length} variants created`
        );
      } catch (err) {
        errors += 1;
        console.error("[sync-zinatex] parent group processing error:", err, { parentSku });
      }
    }

    const summary = {
      processed,
      singles_updated: singlesUpdated,
      variants_updated: variantsUpdated,
      promoted,
      skipped_no_match: skippedNoMatch,
      errors,
      duration_ms: Date.now() - startedAt,
    };
    console.log("[sync-zinatex] summary:", summary);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";
    console.error("[sync-zinatex] fatal error:", message, stack);
    return NextResponse.json(
      {
        error: "Zinatex sync failed",
        message,
        processed,
        singles_updated: singlesUpdated,
        variants_updated: variantsUpdated,
        promoted,
        skipped_no_match: skippedNoMatch,
        errors: errors + 1,
        duration_ms: Date.now() - startedAt,
      },
      { status: 200 }
    );
  }
}
