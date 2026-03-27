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

const SKU_COLUMN = "SKU";
const SOLO_COLUMN = "Images - Solo";

type CsvRow = Record<string, string | null | undefined>;

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
    const sku = row[SKU_COLUMN]?.trim();
    const solo = row[SOLO_COLUMN]?.trim();
    if (sku && solo) {
      // Store/serve URLs must be https (project rule).
      if (!solo.startsWith("https://")) continue;
      mapping.set(sku, solo);
    }
  }

  console.log(`CSV mapping built: ${mapping.size} SKUs with solo images`);

  const pageSize = 500;
  let from = 0;
  let totalProducts = 0;

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;
  let alreadyCorrect = 0;

  while (true) {
    const { data: productsPage, error } = await supabase
      .from("products")
      .select("id, sku, images")
      .eq("manufacturer", "United Furniture")
      .not("images", "is", null)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to fetch products page:", error.message);
      process.exit(1);
    }

    if (!productsPage || productsPage.length === 0) break;

    totalProducts += productsPage.length;

    for (const product of productsPage) {
      const sku = product.sku?.trim();
      if (!sku) { skipped++; continue; }

      const soloUrl = mapping.get(sku);
      if (!soloUrl) { noMatch++; continue; }

      const images: string[] = product.images ?? [];
      if (images.length === 0) { skipped++; continue; }

      // Match requested SQL semantics:
      //   images = ARRAY[solo_url] || images[2:]
      // plus: ensure solo_url is not duplicated later in the array.
      const remainder = images.slice(1); // images[2:]
      const nextImages = [soloUrl, ...remainder.filter((img) => img !== soloUrl)];

      if (arraysEqual(images, nextImages)) {
        alreadyCorrect++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({ images: nextImages })
        .eq("id", product.id);

      if (updateError) {
        console.error(`  Error updating ${sku}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    from += productsPage.length;
    console.log(`Processed ${totalProducts} United products so far...`);
  }

  console.log(`\nResults:`);
  console.log(`  Updated:          ${updated}`);
  console.log(`  Already correct:  ${alreadyCorrect}`);
  console.log(`  No CSV match:     ${noMatch}`);
  console.log(`  Skipped (no SKU): ${skipped}`);
  console.log(`  Total products:   ${totalProducts}`);

  // Verify sample
  console.log(`\n--- Sample verification ---`);
  let sample: any[] | null = null;
  try {
    const { data } = await supabase
      .from("products")
      .select("sku, images")
      .eq("manufacturer", "United Furniture")
      .not("images", "is", null)
      // Supabase/PostgREST supports order expressions in many setups.
      .order("random()")
      .limit(15);
    sample = data;
  } catch (e) {
    console.warn("Random ordering failed; falling back to non-random sample.", e);
  }

  if (!sample) {
    const { data } = await supabase
      .from("products")
      .select("sku, images")
      .eq("manufacturer", "United Furniture")
      .not("images", "is", null)
      .limit(15);
    sample = data;
  }

  for (const p of sample || []) {
    const img = p.images?.[0] ?? "(none)";
    const shortImg = img.length > 80 ? img.substring(0, 80) + "..." : img;
    console.log(`  ${p.sku}  →  ${shortImg}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
