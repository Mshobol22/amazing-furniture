import { parse as parseCsvSync } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchUpsertVariants, validateCronSecret } from "@/lib/cron-utils";
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

/** Reverses preprocess placeholder `5in` → `5"` for SIZE column display only. */
function restoreInchMarksInSize(value: string | undefined): string {
  return String(value ?? "").replace(/(\d)in/g, '$1"');
}

function formatCollectionWords(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Derive design code and collection label from Zinatex Parent SKU patterns. */
function parseDesignInfo(parentSku: string): { designCode: string; collection: string } {
  const parts = parentSku.split("-").filter(Boolean);
  if (parts.length === 0) {
    return { designCode: parentSku.trim() || "unknown", collection: "Unknown" };
  }

  const numericIdx = parts.findIndex((p) => /^\d+$/.test(p));
  if (numericIdx >= 0) {
    const designCode = parts[numericIdx]!;
    const prefix = parts.slice(0, numericIdx).join(" ").trim();
    const collection =
      !prefix && parts.length === 1
        ? "Unknown"
        : formatCollectionWords(prefix.replace(/-/g, " ")) || "Zinatex";
    return { designCode, collection };
  }

  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    const looksLikeSuffix =
      /^[A-Za-z]\d{1,3}$/.test(last) || /^[A-Za-z]{1,2}$/.test(last);
    if (looksLikeSuffix) {
      const designCode = parts[parts.length - 2]!;
      const prefix = parts.slice(0, -2).join(" ").trim();
      const collection =
        formatCollectionWords(prefix.replace(/-/g, " ")) || designCode;
      return { designCode, collection };
    }
  }

  const designCode = parts[parts.length - 1]!;
  const prefix = parts.slice(0, -1).join(" ").trim();
  return {
    designCode,
    collection: formatCollectionWords(prefix.replace(/-/g, " ")) || "Unknown",
  };
}

function buildSlug(name: string, designCode: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-ztx-${designCode.toLowerCase()}`;
}

async function resolveUniqueProductSlug(
  client: ReturnType<typeof createAdminClient>,
  baseSlug: string
): Promise<string> {
  let candidate = baseSlug;
  let n = 2;
  for (;;) {
    const { data } = await client
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }
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
  const sizeFromSku = normalizeSize(getSizeFromVariationSku(sku));
  const sizeFromCsv = restoreInchMarksInSize(row["SIZE"]).trim();
  const normalizedSize = sizeFromCsv
    ? normalizeSize(sizeFromCsv)
    : sizeFromSku;
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
    sort_order: SIZE_ORDER[sizeFromSku ?? ""] ?? 99,
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
  let skippedRows = 0;
  let newProductsCreated = 0;
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

    const rawText = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/") &&
      !contentType.includes("csv") &&
      !contentType.includes("octet-stream")
    ) {
      console.error(
        `[sync-zinatex] Unexpected content-type: ${contentType}. Body preview: ${rawText.slice(0, 300)}`
      );
      return NextResponse.json(
        { error: "Unexpected content type", contentType },
        { status: 200 }
      );
    }

    const sanitizedText = rawText.replace(/(\d)"/g, "$1in");

    const rows = parseCsvSync(sanitizedText, {
      columns: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
      relax_quotes: true,
    }) as ZinatexRow[];

    processed = rows.length;

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
          console.log(
            `[SKIP] Parent SKU: ${parentSku} — no variation SKUs in CSV group`
          );
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
          try {
            const firstRow = groupRows[0]!;
            const csvCollection = String(firstRow["COLLECTION"] ?? "").trim();
            const { designCode, collection: parsedCollection } =
              parseDesignInfo(parentSku);
            const collection = csvCollection || parsedCollection;

            const csvName = String(
              firstRow["NAME"] ?? firstRow["PRODUCT TITLE"] ?? ""
            ).trim();
            let titleCollection = collection;
            if (!csvName && !csvCollection && titleCollection === designCode) {
              titleCollection = "Zinatex";
            }
            const name =
              csvName ||
              `${titleCollection.toUpperCase()} Rug Design ${designCode}`;

            const baseSlug = buildSlug(name, designCode);
            const slug = await resolveUniqueProductSlug(supabase, baseSlug);

            const msrp = toNumber(firstRow["RETAIL PRICE / MSRP"]);
            if (msrp == null || msrp === 0) {
              console.warn(
                `[sync-zinatex] missing or zero MSRP for new product parent ${parentSku}, using price 0`
              );
            }
            const price =
              msrp == null ? 0 : round2((msrp / 4) * 2.2);

            const image = asHttpsUrl(firstRow["MAIN IMAGE"]);
            const hasVariants = groupRows.length > 1;
            const variationSku = String(
              firstRow["Variation SKU"] ?? ""
            ).trim();

            const newProduct = {
              sku: variationSku,
              name,
              slug,
              manufacturer: "Zinatex",
              category: "rugs",
              collection,
              price,
              in_stock: groupRows.some(
                (r) => (toNumber(r["QUANTITY ON HAND"]) ?? 0) > 0
              ),
              images: image ? [image] : [],
              has_variants: hasVariants,
              variant_type: hasVariants ? ("rug" as const) : null,
              description: `${name}. Available in multiple sizes and colors.`,
              tags: [] as string[],
              rating: 0,
              review_count: 0,
            };

            const { data: inserted, error: insertError } = await supabase
              .from("products")
              .insert(newProduct)
              .select("id")
              .single();

            if (insertError || !inserted?.id) {
              skippedNoMatch += 1;
              errors += 1;
              console.error(
                `[sync-zinatex] failed to create product for ${parentSku}:`,
                insertError?.message
              );
              continue;
            }

            newProductsCreated += 1;
            console.log(
              `[CREATE] Parent SKU: ${parentSku} — new product ${inserted.id} (${slug})`
            );

            if (hasVariants) {
              const variantRows = groupRows
                .map((row) => buildVariantRow(row, inserted.id))
                .filter((row): row is Partial<ProductVariant> => row != null);

              const varResult = await batchUpsertVariants(
                supabase,
                variantRows,
                UPSERT_BATCH_SIZE
              );
              errors += varResult.errors;
              if (varResult.errors > 0) {
                console.error(
                  `[sync-zinatex] variant upsert had errors for ${parentSku} (${varResult.errors} rows)`
                );
              }
            }
          } catch (createErr) {
            skippedNoMatch += 1;
            errors += 1;
            console.error(
              `[sync-zinatex] auto-create failed for ${parentSku}:`,
              createErr
            );
          }
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
      new_products_created: newProductsCreated,
      skipped_no_match: skippedNoMatch,
      skipped_rows: skippedRows,
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
        new_products_created: newProductsCreated,
        skipped_no_match: skippedNoMatch,
        skipped_rows: skippedRows,
        errors: errors + 1,
        duration_ms: Date.now() - startedAt,
      },
      { status: 200 }
    );
  }
}
