/**
 * Fix NFD product names by constructing human-readable names from the NFD datasheet.
 *
 * Name format: "{itemGroupCode} {itemName}" e.g. "B101 Queen Bed"
 * With finish:  "{itemGroupCode} {itemName} — {Finish}" e.g. "B101 Queen Bed — Rustic Brown"
 *
 * Only updates NFD products where trim(name) = trim(sku) (i.e. still raw SKU codes).
 *
 * Preview (no DB writes):
 *   PowerShell: $env:DRY_RUN="true"; npx tsx scripts/fix-nfd-names.ts
 *   bash:       DRY_RUN=true npx tsx scripts/fix-nfd-names.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const XLSX_PATH = "C:/Users/mshob/OneDrive/csv for AHF/NFD datasheet.xlsx";
const PAGE_SIZE = 1000;
const FINISH_RE = /\bIN (?:AN? )?([\w ,']+?) FINISH/i;

const DRY_RUN = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

type CsvEntry = {
  sku: string;
  newName: string;
};

/** Read the NFD datasheet and build a map of SKU -> constructed name. */
function buildSkuNameMap(): Map<string, string> {
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  }) as (string | null)[][];

  // Columns (0-indexed): 0=itemGroupCode, 1=itemCode, 2=itemName, 10=itemGroupFeatures
  const map = new Map<string, string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const groupCode = (row[0] ?? "").toString().trim();
    const sku = (row[1] ?? "").toString().trim();
    const pieceName = (row[2] ?? "").toString().trim();
    const features = (row[10] ?? "").toString().trim();

    if (!sku || !pieceName) continue;

    // Construct base name: "{groupCode} {pieceName}"
    const baseName = groupCode ? `${groupCode} ${pieceName}` : pieceName;

    // Try to extract finish from features text
    const finishMatch = FINISH_RE.exec(features);
    const finish = finishMatch
      ? finishMatch[1]!
          .trim()
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      : null;

    const newName = finish ? `${baseName} — ${finish}` : baseName;
    map.set(sku, newName);
  }

  return map;
}

type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
};

/** Fetch all NFD products where name (trimmed) equals sku (trimmed). */
async function fetchTargetProducts(): Promise<ProductRow[]> {
  const out: ProductRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name")
      .eq("manufacturer", "Nationwide FD")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase fetch error:", error);
      process.exit(1);
    }

    const chunk = (data ?? []) as ProductRow[];
    for (const row of chunk) {
      const nameTrimmed = row.name?.trim() ?? "";
      const skuTrimmed = row.sku?.trim() ?? "";
      // Only update rows where name still equals the raw SKU
      if (skuTrimmed && nameTrimmed === skuTrimmed) {
        out.push(row);
      }
    }

    if (chunk.length < PAGE_SIZE) break;
  }
  return out;
}

async function main() {
  console.log(
    DRY_RUN
      ? "DRY_RUN=true — no database updates will be written.\n"
      : "LIVE run — products will be updated.\n"
  );

  console.log("Reading NFD datasheet...");
  const skuNameMap = buildSkuNameMap();
  console.log(`Loaded ${skuNameMap.size} SKUs with constructed names from datasheet.\n`);

  console.log("Fetching NFD products where name = sku (still raw SKU codes)...");
  const products = await fetchTargetProducts();
  console.log(`Found ${products.length} NFD products to evaluate.\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const sku = product.sku?.trim() ?? "";
    const newName = skuNameMap.get(sku);

    if (!newName) {
      console.warn(`Skip ${product.id} (${sku}) — no matching row in datasheet`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY_RUN] ${product.id} (${sku}) -> ${JSON.stringify(newName)}`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({ name: newName })
      .eq("id", product.id);

    if (error) {
      console.error(`Update failed ${product.id} (${sku}):`, error.message);
      skipped++;
    } else {
      console.log(`Updated (${sku}) -> ${JSON.stringify(newName)}`);
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
