/**
 * Reads the United Furniture CSV and updates each product's images array
 * so that the "Images - Solo" URL becomes the primary (first) image.
 *
 * Usage:  npx tsx scripts/remap-united-solo-images.ts
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
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

const CSV_PATH = "C:\\Users\\mshob\\OneDrive\\csv for AHF\\united datasheet.csv";

interface CsvRow {
  SKU: string;
  "Images - Solo": string;
}

async function main() {
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows: CsvRow[] = parse(raw, {
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  const mapping = new Map<string, string>();
  for (const row of rows) {
    const sku = row["SKU"]?.trim();
    const solo = row["Images - Solo"]?.trim();
    if (sku && solo && solo.startsWith("https://")) {
      mapping.set(sku, solo);
    }
  }

  console.log(`CSV mapping built: ${mapping.size} SKUs with solo images`);

  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, images")
    .eq("manufacturer", "United Furniture")
    .not("images", "is", null);

  if (error) {
    console.error("Failed to fetch products:", error.message);
    process.exit(1);
  }

  console.log(`Found ${products.length} United Furniture products in DB`);

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;
  let alreadyCorrect = 0;

  for (const product of products) {
    const sku = product.sku?.trim();
    if (!sku) { skipped++; continue; }

    const soloUrl = mapping.get(sku);
    if (!soloUrl) { noMatch++; continue; }

    const images: string[] = product.images ?? [];
    if (images.length === 0) { skipped++; continue; }

    if (images[0] === soloUrl) {
      alreadyCorrect++;
      continue;
    }

    // Remove the solo URL if it already exists elsewhere in the array
    const filtered = images.filter((img: string) => img !== soloUrl);
    const newImages = [soloUrl, ...filtered];

    const { error: updateError } = await supabase
      .from("products")
      .update({ images: newImages })
      .eq("id", product.id);

    if (updateError) {
      console.error(`  Error updating ${sku}: ${updateError.message}`);
    } else {
      updated++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Updated:          ${updated}`);
  console.log(`  Already correct:  ${alreadyCorrect}`);
  console.log(`  No CSV match:     ${noMatch}`);
  console.log(`  Skipped (no SKU): ${skipped}`);
  console.log(`  Total products:   ${products.length}`);

  // Verify sample
  console.log(`\n--- Sample verification ---`);
  const { data: sample } = await supabase
    .from("products")
    .select("sku, images")
    .eq("manufacturer", "United Furniture")
    .not("images", "is", null)
    .limit(10);

  if (sample) {
    for (const p of sample) {
      const img = p.images?.[0] ?? "(none)";
      const shortImg = img.length > 80 ? img.substring(0, 80) + "..." : img;
      console.log(`  ${p.sku}  →  ${shortImg}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
