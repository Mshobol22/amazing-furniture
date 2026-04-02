import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchUpsertVariants, validateCronSecret } from "@/lib/cron-utils";
import type { ProductVariant } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZINATEX_SPECS_URL =
  "https://zinatexrugs.com/wp-content/uploads/woo-feed/custom/csv/zinatexproductfeed.csv";
const ZINATEX_INVENTORY_URL =
  "https://zinatexrugs.com/wp-content/uploads/woo-feed/custom/csv/zinatexproductfeed2-2.csv";

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

function parseZinatexCSV(rawText: string): ZinatexRow[] {
  let text = rawText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  text = text.replace(/(\d)"/g, "$1in");
  text = text.replace(/([a-zA-Z])"/g, "$1in");

  try {
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as ZinatexRow[];

    if (records.length > 0) {
      console.log(
        "[sync-zinatex] CSV headers detected:",
        Object.keys(records[0]!).join(" | ")
      );
    }

    return records;
  } catch (err) {
    console.error(
      "[sync-zinatex] csv-parse error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

function getField(row: ZinatexRow, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key]!.trim();
  }
  return "";
}

function asHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed;
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
function restoreInchMarksInSize(value: string): string {
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
  productId: string,
  resolveStockQty: (variationSku: string, specsRow: ZinatexRow) => number,
  resolveInStock: (variationSku: string, specsRow: ZinatexRow) => boolean
): Partial<ProductVariant> | null {
  const sku = getField(
    row,
    "Variation SKU",
    "VARIATION SKU",
    "variation_sku",
    "SKU"
  );
  if (!sku) return null;

  const stockQty = resolveStockQty(sku, row);
  const msrpRaw = getField(
    row,
    "RETAIL PRICE / MSRP",
    "MSRP",
    "Price",
    "PRICE",
    "price"
  );
  const msrp = parseFloat(msrpRaw.replace(/[^0-9.]/g, "")) || 0;
  const price = round2((msrp / 4) * 2.2);

  const sizeFromSku = normalizeSize(getSizeFromVariationSku(sku));
  const sizeFromCsv = restoreInchMarksInSize(
    getField(row, "SIZE", "Size", "size")
  ).trim();
  const normalizedSize = sizeFromCsv ? normalizeSize(sizeFromCsv) : sizeFromSku;
  const image = asHttpsUrl(getField(row, "MAIN IMAGE", "Image", "IMAGE", "image_url"));
  const color = getField(row, "COLOR", "Color", "color") || null;

  return {
    product_id: productId,
    sku,
    size: normalizedSize,
    color,
    price,
    in_stock: resolveInStock(sku, row),
    stock_qty: stockQty,
    image_url: image,
    sort_order: SIZE_ORDER[sizeFromSku ?? ""] ?? 99,
  };
}

function prepareVariantRowsForUpsert(
  variantRows: Partial<ProductVariant>[]
): Partial<ProductVariant>[] {
  const validVariantRows = variantRows.filter((row) => {
    if (!row.sku || typeof row.sku !== "string" || row.sku.trim() === "") {
      console.warn("[sync-zinatex] skipping variant with empty SKU");
      return false;
    }
    if (!row.product_id) {
      console.warn("[sync-zinatex] skipping variant with null product_id, sku:", row.sku);
      return false;
    }
    if (typeof row.price !== "number" || !Number.isFinite(row.price)) {
      console.warn(
        "[sync-zinatex] skipping variant with invalid price, sku:",
        row.sku,
        "price:",
        row.price
      );
      return false;
    }
    return true;
  });

  const seen = new Set<string>();
  return validVariantRows.filter((row) => {
    const sku = (row.sku as string).trim();
    if (seen.has(sku)) return false;
    seen.add(sku);
    return true;
  });
}

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const start = Date.now();
  let specRows: ZinatexRow[] = [];
  const inventoryMap = new Map<string, number>();
  let singlesUpdated = 0;
  let variantsUpdated = 0;
  let promoted = 0;
  let skippedNoMatch = 0;
  let newProductsCreated = 0;
  let errors = 0;

  function resolveInStock(variationSku: string, specsRow: ZinatexRow): boolean {
    if (inventoryMap.has(variationSku)) {
      return inventoryMap.get(variationSku)! > 0;
    }
    const fallbackQty =
      parseInt(
        (
          specsRow["QUANTITY ON HAND"] ||
          specsRow["Quantity"] ||
          getField(specsRow, "QTY", "qty", "Stock", "STOCK") ||
          "0"
        ).replace(/[^0-9]/g, ""),
        10
      ) || 0;
    return fallbackQty > 0;
  }

  function resolveStockQty(variationSku: string, specsRow: ZinatexRow): number {
    if (inventoryMap.has(variationSku)) return inventoryMap.get(variationSku)!;
    return (
      parseInt(
        (
          specsRow["QUANTITY ON HAND"] ||
          specsRow["Quantity"] ||
          getField(specsRow, "QTY", "qty", "Stock", "STOCK") ||
          "0"
        ).replace(/[^0-9]/g, ""),
        10
      ) || 0
    );
  }

  try {
    const [specsRes, inventoryRes] = await Promise.all([
      fetch(ZINATEX_SPECS_URL, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      }),
      fetch(ZINATEX_INVENTORY_URL, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      }),
    ]);

    if (!specsRes.ok) {
      console.error(`[sync-zinatex] specs CSV failed: ${specsRes.status}`);
      return Response.json({ error: "Specs CSV unavailable" }, { status: 200 });
    }

    if (!inventoryRes.ok) {
      console.warn(
        `[sync-zinatex] inventory CSV failed: ${inventoryRes.status} — continuing with specs only`
      );
    }

    const specsText = await specsRes.text();
    const inventoryText = inventoryRes.ok ? await inventoryRes.text() : "";

    if (inventoryText) {
      const inventoryRows = parseZinatexCSV(inventoryText);
      console.log(`[sync-zinatex] inventory CSV: ${inventoryRows.length} rows`);

      for (const row of inventoryRows) {
        const sku = (
          row["Variation SKU"] ||
          row["SKU"] ||
          row["sku"] ||
          row["VARIATION SKU"] ||
          row["Sku"] ||
          ""
        ).trim();

        const qtyRaw = (
          row["QUANTITY ON HAND"] ||
          row["Quantity"] ||
          row["quantity"] ||
          row["QTY"] ||
          row["qty"] ||
          row["Stock"] ||
          row["STOCK"] ||
          row["Inventory"] ||
          row["INVENTORY"] ||
          "0"
        ).trim();

        const qty = parseInt(qtyRaw.replace(/[^0-9]/g, ""), 10) || 0;
        if (sku) inventoryMap.set(sku, qty);
      }

      console.log(`[sync-zinatex] inventory map: ${inventoryMap.size} SKUs loaded`);
    }

    specRows = parseZinatexCSV(specsText);
    console.log(`[sync-zinatex] specs CSV: ${specRows.length} rows`);

    const groups = new Map<string, ZinatexRow[]>();
    for (const row of specRows) {
      const parentSku = getField(row, "Parent SKU", "PARENT SKU", "parent_sku");
      if (!parentSku) continue;
      if (!groups.has(parentSku)) groups.set(parentSku, []);
      groups.get(parentSku)!.push(row);
    }

    console.log(`[sync-zinatex] ${groups.size} product groups to process`);

    for (const [parentSku, groupRows] of groups) {
      try {
        const variationSkus = groupRows
          .map((r) =>
            getField(r, "Variation SKU", "VARIATION SKU", "variation_sku", "SKU")
          )
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
          console.error(
            "[sync-zinatex] parent lookup error:",
            parentLookupError.message,
            { parentSku }
          );
          continue;
        }

        if (!parentProduct) {
          try {
            const firstRow = groupRows[0]!;
            const csvCollection = getField(
              firstRow,
              "COLLECTION",
              "Collection",
              "collection"
            );
            const { designCode, collection: parsedCollection } =
              parseDesignInfo(parentSku);
            const collection = csvCollection || parsedCollection;

            const csvName = getField(
              firstRow,
              "NAME",
              "Name",
              "PRODUCT TITLE",
              "Product Title",
              "Title",
              "TITLE"
            );
            let titleCollection = collection;
            if (!csvName && !csvCollection && titleCollection === designCode) {
              titleCollection = "Zinatex";
            }
            const name =
              csvName ||
              `${titleCollection.toUpperCase()} Rug Design ${designCode}`;

            const baseSlug = buildSlug(name, designCode);
            const slug = await resolveUniqueProductSlug(supabase, baseSlug);

            const msrpRaw = getField(
              firstRow,
              "RETAIL PRICE / MSRP",
              "MSRP",
              "Price",
              "PRICE",
              "price"
            );
            const msrp = parseFloat(msrpRaw.replace(/[^0-9.]/g, "")) || 0;
            if (msrp === 0) {
              console.warn(
                `[sync-zinatex] missing or zero MSRP for new product parent ${parentSku}, using price 0`
              );
            }
            const price = round2((msrp / 4) * 2.2);

            const image = asHttpsUrl(
              getField(firstRow, "MAIN IMAGE", "Image", "IMAGE", "image_url")
            );
            const hasVariants = groupRows.length > 1;
            const variationSku = getField(
              firstRow,
              "Variation SKU",
              "VARIATION SKU",
              "variation_sku",
              "SKU"
            );

            const newProduct = {
              sku: variationSku,
              name,
              slug,
              manufacturer: "Zinatex",
              category: "rugs",
              collection,
              price,
              in_stock: groupRows.some((r) =>
                resolveInStock(
                  getField(
                    r,
                    "Variation SKU",
                    "VARIATION SKU",
                    "variation_sku",
                    "SKU"
                  ),
                  r
                )
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
                .map((row) =>
                  buildVariantRow(row, inserted.id, resolveStockQty, resolveInStock)
                )
                .filter((row): row is Partial<ProductVariant> => row != null);

              const varResult = await batchUpsertVariants(
                supabase,
                prepareVariantRowsForUpsert(variantRows),
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
          const row = groupRows[0]!;
          const vSku = getField(
            row,
            "Variation SKU",
            "VARIATION SKU",
            "variation_sku",
            "SKU"
          );
          const msrpRaw = getField(
            row,
            "RETAIL PRICE / MSRP",
            "MSRP",
            "Price",
            "PRICE",
            "price"
          );
          const msrpParsed = parseFloat(msrpRaw.replace(/[^0-9.]/g, ""));
          const msrp = Number.isFinite(msrpParsed) ? msrpParsed : null;
          const image = asHttpsUrl(
            getField(row, "MAIN IMAGE", "Image", "IMAGE", "image_url")
          );

          const patch: {
            in_stock?: boolean;
            price?: number;
            images?: string[];
          } = {};

          patch.in_stock = resolveInStock(vSku, row);
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
              console.error(
                "[sync-zinatex] single update error:",
                updateError.message,
                { sku: parentProduct.sku }
              );
            } else {
              singlesUpdated += 1;
              console.log(`[SINGLE] ${parentProduct.sku} — updated in_stock + price`);
            }
          }
          continue;
        }

        if (parentProduct.has_variants) {
          const variantRows = groupRows
            .map((row) =>
              buildVariantRow(row, parentProduct.id, resolveStockQty, resolveInStock)
            )
            .filter((row): row is Partial<ProductVariant> => row != null);

          const toUpsert = prepareVariantRowsForUpsert(variantRows);
          const result = await batchUpsertVariants(
            supabase,
            toUpsert,
            UPSERT_BATCH_SIZE
          );
          variantsUpdated += result.updated;
          errors += result.errors;
          console.log(
            `[VARIANT-UPDATE] ${parentSku} — ${toUpsert.length} variants upserted`
          );
          continue;
        }

        const { error: promoteError } = await supabase
          .from("products")
          .update({ has_variants: true, variant_type: "rug" })
          .eq("id", parentProduct.id);
        if (promoteError) {
          errors += 1;
          console.error(
            "[sync-zinatex] promotion product update error:",
            promoteError.message,
            { sku: parentProduct.sku }
          );
          continue;
        }

        const promotedVariantRows = groupRows
          .map((row) =>
            buildVariantRow(row, parentProduct.id, resolveStockQty, resolveInStock)
          )
          .filter((row): row is Partial<ProductVariant> => row != null);

        const promoteResult = await batchUpsertVariants(
          supabase,
          prepareVariantRowsForUpsert(promotedVariantRows),
          UPSERT_BATCH_SIZE
        );
        errors += promoteResult.errors;
        promoted += 1;
        console.log(
          `[PROMOTED] ${parentProduct.sku} → has_variants=true, ${promotedVariantRows.length} variants created`
        );
      } catch (err) {
        errors += 1;
        console.error("[sync-zinatex] parent group processing error:", err, {
          parentSku,
        });
      }
    }

    const summary = {
      specs_rows: specRows.length,
      inventory_skus: inventoryMap.size,
      groups_processed: groups.size,
      singles_updated: singlesUpdated,
      variants_updated: variantsUpdated,
      promoted,
      new_products_created: newProductsCreated,
      skipped_no_match: skippedNoMatch,
      errors,
      duration_ms: Date.now() - start,
    };
    console.log("[sync-zinatex] summary:", summary);
    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";
    console.error("[sync-zinatex] fatal error:", message, stack);
    return Response.json(
      {
        error: "Zinatex sync failed",
        message,
        specs_rows: specRows.length,
        inventory_skus: inventoryMap.size,
        groups_processed: 0,
        singles_updated: singlesUpdated,
        variants_updated: variantsUpdated,
        promoted,
        new_products_created: newProductsCreated,
        skipped_no_match: skippedNoMatch,
        errors: errors + 1,
        duration_ms: Date.now() - start,
      },
      { status: 200 }
    );
  }
}
