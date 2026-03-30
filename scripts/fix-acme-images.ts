/**
 * Fix ACME placeholder images by reading real URLs from the ACME datasheet.
 *
 * Preview (no DB writes):
 *   PowerShell: $env:DRY_RUN="true"; npx tsx scripts/fix-acme-images.ts
 *   bash:       DRY_RUN=true npx tsx scripts/fix-acme-images.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import path from "path";

const PLACEHOLDER = "/images/placeholder-product.jpg";
const XLSX_PATH = "C:/Users/mshob/OneDrive/csv for AHF/acme datasheet.xlsx";
const PAGE_SIZE = 1000;

const DRY_RUN = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

/** Build a map of SKU -> string[] of image URLs from the ACME Excel file. */
function buildSkuImageMap(): Map<string, string[]> {
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    header: 1,
    defval: null,
  }) as unknown[][];

  // Find header row column indices
  const headerRow = rows[0] as (string | null)[];
  const skuColIdx = headerRow.findIndex(
    (h) => typeof h === "string" && h.trim() === "Item No."
  );
  const imgColIdx = headerRow.findIndex(
    (h) => typeof h === "string" && h.trim() === "All Product Image URL"
  );

  if (skuColIdx === -1) throw new Error("Could not find 'Item No.' column in ACME datasheet");
  if (imgColIdx === -1) throw new Error("Could not find 'All Product Image URL' column in ACME datasheet");

  console.log(`Found SKU column at index ${skuColIdx}, image column at index ${imgColIdx}`);

  const map = new Map<string, string[]>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as (unknown | null)[];
    const skuRaw = row[skuColIdx];
    const imgRaw = row[imgColIdx];

    if (!skuRaw || typeof skuRaw !== "string" || skuRaw.trim() === "") continue;
    if (!imgRaw || typeof imgRaw !== "string" || imgRaw.trim() === "") continue;

    const sku = skuRaw.trim();
    const urls = imgRaw
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("https://"));

    if (urls.length === 0) continue;

    map.set(sku, urls);
  }

  return map;
}

type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  images: string[] | null;
};

/** Fetch all ACME products where images[1] is the placeholder or null. */
async function fetchTargetProducts(): Promise<ProductRow[]> {
  const out: ProductRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, images")
      .eq("manufacturer", "ACME")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase fetch error:", error);
      process.exit(1);
    }

    const chunk = (data ?? []) as ProductRow[];
    for (const row of chunk) {
      const img1 = row.images?.[1] ?? null;
      if (img1 === PLACEHOLDER || img1 === null) {
        out.push(row);
      }
    }

    if (chunk.length < PAGE_SIZE) break;
  }
  return out;
}

async function main() {
  console.log(DRY_RUN ? "DRY_RUN=true — no database updates will be written.\n" : "LIVE run — products will be updated.\n");

  console.log("Reading ACME datasheet...");
  const skuImageMap = buildSkuImageMap();
  console.log(`Loaded ${skuImageMap.size} SKUs with image URLs from datasheet.\n`);

  console.log("Fetching ACME products with placeholder/null images[1]...");
  const products = await fetchTargetProducts();
  console.log(`Found ${products.length} ACME products to evaluate.\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    // Use SKU first, fall back to name (which stores the item code per CLAUDE.md)
    const sku = (product.sku?.trim() || product.name?.trim() || "").trim();

    if (!sku) {
      console.warn(`Skip ${product.id} — no SKU or name`);
      skipped++;
      continue;
    }

    const urls = skuImageMap.get(sku);
    if (!urls || urls.length === 0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY_RUN] would update ${product.id} (${sku}) -> ${urls.length} image(s): ${urls[0]}`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({ images: urls })
      .eq("id", product.id);

    if (error) {
      console.error(`Update failed ${product.id} (${sku}):`, error.message);
      skipped++;
    } else {
      console.log(`Updated ${product.id} (${sku}) -> ${urls.length} image(s)`);
      updated++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Evaluated:           ${products.length}`);
  if (DRY_RUN) {
    console.log(`Would update:        ${updated}`);
    console.log(`Would skip:          ${skipped}`);
  } else {
    console.log(`Updated in DB:       ${updated}`);
    console.log(`Skipped (no match):  ${skipped}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
