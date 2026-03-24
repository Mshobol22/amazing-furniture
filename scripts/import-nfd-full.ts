/**
 * scripts/import-nfd-full.ts
 *
 * Full UPSERT import of all Nationwide FD products from XLSX.
 * Runs locally only — never deploy to Vercel.
 *
 * Usage:
 *   npx tsx scripts/import-nfd-full.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ─── Config ──────────────────────────────────────────────────────────────────

const XLSX_PATH =
  "C:/Users/mshob/OneDrive/csv for AHF/NFD datasheet.xlsx";
const BATCH_SIZE = 50;

// ─── Supabase service-role client ────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ─── Category mapping (all 19 unique values from datasheet) ──────────────────

const CATEGORY_MAP: Record<string, string> = {
  "Bedroom > Bed Frames": "bed",
  "Bedroom > Bedrooms": "bedroom-furniture",
  "Bedroom > Bedrooms > Daybed": "bed",
  "Bedroom > Beds Only": "bed",
  "Bedroom > Bunk Beds": "bed",
  "Bedroom > Chests": "bedroom-furniture",
  "Dining Room": "table",
  "Dining Room > Dinette Sets": "table",
  "Dining Room > Pub Sets": "table",
  "Living Room > Accent Chairs": "chair",
  "Living Room > Chaises": "sofa",
  "Living Room > Motions": "sofa",
  "Living Room > Recliners": "chair",
  "Living Room > Sectionals": "sofa",
  "Living Room > Sleepers": "sofa",
  "Living Room > Sofas ∕ Loveseats": "sofa",
  Occasional: "table",
  Packaging: "other",
  "TV Stands": "tv-stand",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildSlug(name: string, sku: string): string {
  const namePart = toSlug(name).slice(0, 60).replace(/-$/, "");
  return `${namePart}-nfd-${sku.toLowerCase()}`;
}

function mapCategory(rawCategory: string | undefined): string {
  if (!rawCategory) return "other";
  return CATEGORY_MAP[rawCategory.trim()] ?? "other";
}

function buildImages(imageUrl: unknown): string[] {
  if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
    return [imageUrl.trim()];
  }
  return [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Reading XLSX:", XLSX_PATH);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];

  // header: 1 → array-of-arrays; skip first row (headers)
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const dataRows = allRows.slice(1); // skip header row

  console.log(`Total data rows in file: ${dataRows.length}`);

  // Column indices (0-based):
  // 0: itemGroupCode, 1: itemCode (SKU), 2: itemName, 3: itemPrice,
  // 4: itemMinimumRequired, 5: itemQuantityInStock, 6: itemGroupCategory,
  // 7: itemGroupImage, 8: itemGroupThumb, 9: itemGroupMeasurements,
  // 10: itemGroupFeatures

  const products: object[] = [];
  let skipped = 0;

  for (const row of dataRows as unknown[][]) {
    const sku = row[1] != null ? String(row[1]).trim() : "";

    if (!sku) {
      skipped++;
      continue;
    }

    const rawName = row[2] != null ? String(row[2]).trim() : "";
    const rawCategory = row[6] != null ? String(row[6]).trim() : "";
    const category = mapCategory(rawCategory);

    // Fallback name: "Category SKU" e.g. "Bedroom Set B200"
    const displayCategory =
      rawCategory.split(">").pop()?.trim() ?? "Furniture";
    const name = rawName || `${displayCategory} ${sku}`;

    const price =
      typeof row[3] === "number" ? row[3] : parseFloat(String(row[3])) || 0;
    const images = buildImages(row[7]);
    const slug = buildSlug(name, sku);

    const measurements =
      row[9] != null ? String(row[9]).replace(/[\uFFFD\uFFFE\uFFFF]/g, "").trim() : "";
    const features =
      row[10] != null ? String(row[10]).replace(/[\uFFFD\uFFFE\uFFFF]/g, "").trim() : "";

    const description = [features, measurements ? `Measurements: ${measurements}` : ""]
      .filter(Boolean)
      .join("\n\n");

    products.push({
      sku,
      name,
      price,
      images,
      category,
      manufacturer: "Nationwide FD",
      in_stock: true,
      slug,
      description,
      color: null,
      material: null,
    });
  }

  console.log(
    `Rows to upsert: ${products.length} | Skipped (no SKU): ${skipped}`
  );

  // ─── Batch upsert ────────────────────────────────────────────────────────

  const totalBatches = Math.ceil(products.length / BATCH_SIZE);
  let totalUpserted = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(
      `Importing batch ${batchNum}/${totalBatches} (${batch.length} products)...`
    );

    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "slug" });

    if (error) {
      console.error(`Batch ${batchNum} failed:`, error.message);
      console.error("First row of failed batch:", JSON.stringify(batch[0]));
      process.exit(1);
    }

    totalUpserted += batch.length;
  }

  console.log(
    `\nDone. ${totalUpserted} inserted/updated, ${skipped} skipped (no SKU).`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
