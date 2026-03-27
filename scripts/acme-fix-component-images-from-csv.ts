/**
 * Part A: Remap ACME component primary images from the ACME datasheet XLSX.
 *
 * - SKU is in `Item No.`
 * - Images are in `All Product Image URL` (comma-separated URLs)
 * - Only updates rows where CSV `Product Type` is `Components`
 *
 * Usage:
 *   npx tsx scripts/acme-fix-component-images-from-csv.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import * as xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else {
  const mainEnv = "C:\\Users\\mshob\\OneDrive\\Desktop\\amazing furniture\\.env.local";
  if (fs.existsSync(mainEnv)) dotenv.config({ path: mainEnv });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const XLSX_PATH = "C:\\Users\\mshob\\OneDrive\\csv for AHF\\acme datasheet.xlsx";

function parseImageCell(cell: unknown): string[] {
  const raw = String(cell ?? "").trim();
  if (!raw) return [];

  // The sheet uses commas to separate URLs.
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);

  // Keep only valid https URLs and de-duplicate while preserving order.
  const out: string[] = [];
  for (const url of parts) {
    if (!url.startsWith("https://")) continue;
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

function findColumn(headers: string[], predicate: (h: string) => boolean) {
  return headers.find((h) => predicate(h));
}

async function main() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const headerRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerRow = (headerRows[0] as any[]) || [];
  const headers = headerRow.map((h) => (h == null ? "" : String(h)));

  const skuCol =
    findColumn(headers, (h) => /Item\s*No\./i.test(h)) || "Item No.";
  const imgCol =
    findColumn(headers, (h) => /All\s*Product\s*Image\s*URL/i.test(h)) ||
    "All Product Image URL";
  const typeCol = findColumn(headers, (h) => /^Product\s*Type/i.test(h)) || "Product Type";

  const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });

  console.log("Detected columns:", { skuCol, imgCol, typeCol });

  // Build SKU -> image array for component SKUs only.
  const componentImageMap = new Map<string, string[]>();
  let componentRowCount = 0;
  let componentWithImageCount = 0;
  for (const row of rows) {
    const sku = String(row[skuCol] ?? "").trim();
    if (!sku) continue;

    const type = String(row[typeCol] ?? "").trim();
    if (!/components/i.test(type)) continue;
    componentRowCount++;

    const images = parseImageCell(row[imgCol]);
    if (images.length === 0) continue;

    componentWithImageCount++;
    componentImageMap.set(sku, images);
  }

  console.log(`Component rows in XLSX: ${componentRowCount}`);
  console.log(`Components with non-empty https images: ${componentWithImageCount}`);
  console.log(
    `Loaded component image mapping: ${componentImageMap.size} SKUs from CSV`
  );

  // Iterate through ACME products in pages; only update when sku is in mapping.
  const pageSize = 500;
  let from = 0;
  let processed = 0;
  let updated = 0;
  let skippedNoMapping = 0;
  let skippedNoChange = 0;

  while (true) {
    const { data: productsPage, error } = await supabase
      .from("products")
      .select("id, sku, images")
      .eq("manufacturer", "ACME")
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to fetch products page:", error.message);
      process.exit(1);
    }
    if (!productsPage || productsPage.length === 0) break;

    processed += productsPage.length;

    for (const product of productsPage) {
      const sku = product.sku?.toString().trim() || "";
      if (!sku) continue;

      const expected = componentImageMap.get(sku);
      if (!expected) {
        skippedNoMapping++;
        continue;
      }

      const currentImages: string[] = Array.isArray(product.images) ? product.images : [];
      const currentPrimary = currentImages[0] || null;
      const expectedPrimary = expected[0] || null;

      if (!expectedPrimary) continue;
      if (currentPrimary === expectedPrimary) {
        skippedNoChange++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({ images: expected })
        .eq("id", product.id);

      if (updateError) {
        console.error(`  Error updating ${sku}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    from += productsPage.length;
    console.log(`Processed ${processed} ACME products so far...`);
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no mapping): ${skippedNoMapping}`);
  console.log(`  Skipped (already correct): ${skippedNoChange}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

