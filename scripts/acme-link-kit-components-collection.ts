/**
 * Part B: Link ACME KIT components to their parent KIT's `collection`.
 *
 * In the ACME datasheet XLSX:
 * - SKU is in `Item No.`
 * - KIT vs Components is in `Product Type` ('KIT' and 'Components')
 *
 * Many component SKUs embed the parent KIT SKU as a prefix (e.g. 02020W -> 02020W-HF).
 * We derive component -> parent by picking the KIT SKU with the longest prefix match.
 *
 * Usage:
 *   npx tsx scripts/acme-link-kit-components-collection.ts
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
  const typeCol =
    findColumn(headers, (h) => /^Product\s*Type/i.test(h)) || "Product Type";

  const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });

  const kitSkus = new Set<string>();
  const componentSkus = new Set<string>();

  for (const row of rows) {
    const sku = String(row[skuCol] ?? "").trim();
    if (!sku) continue;
    const type = String(row[typeCol] ?? "").trim();
    if (/^kit$/i.test(type)) kitSkus.add(sku);
    if (/components/i.test(type)) componentSkus.add(sku);
  }

  const kitSkuList = [...kitSkus];
  const componentSkuList = [...componentSkus];

  console.log(`KIT SKUs: ${kitSkuList.length}`);
  console.log(`Component SKUs: ${componentSkuList.length}`);

  // Derive parent kit sku from longest prefix match.
  const componentToKit = new Map<string, string>();
  for (const componentSku of componentSkuList) {
    let bestKit = "";
    for (const kitSku of kitSkuList) {
      if (!kitSku) continue;
      if (componentSku === kitSku) continue;
      if (!componentSku.startsWith(kitSku)) continue;
      if (kitSku.length > bestKit.length) bestKit = kitSku;
    }
    if (bestKit) componentToKit.set(componentSku, bestKit);
  }

  console.log(
    `Component -> parent kit matches: ${componentToKit.size} / ${componentSkuList.length}`
  );

  // Fetch kit collections from DB.
  const { data: kitRows, error: kitFetchError } = kitSkuList.length
    ? await supabase
        .from("products")
        .select("sku, collection")
        .eq("manufacturer", "ACME")
        .in("sku", kitSkuList)
    : ({ data: [], error: null } as any);

  if (kitFetchError) {
    console.error("Failed to fetch kit collections:", kitFetchError.message);
    process.exit(1);
  }

  const kitCollectionMap = new Map<string, string | null>();
  for (const r of kitRows || []) {
    const c = r.collection ?? null;
    kitCollectionMap.set(r.sku, c);
  }

  // Update component collections where they differ.
  const pageSize = 500;
  let from = 0;
  let processed = 0;
  let updated = 0;
  let skippedNoParent = 0;
  let skippedNoCollection = 0;
  let skippedNoChange = 0;

  while (true) {
    const { data: productsPage, error } = await supabase
      .from("products")
      .select("id, sku, collection")
      .eq("manufacturer", "ACME")
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to fetch ACME products page:", error.message);
      process.exit(1);
    }
    if (!productsPage || productsPage.length === 0) break;

    processed += productsPage.length;

    for (const product of productsPage) {
      const sku = product.sku?.toString().trim() || "";
      if (!componentToKit.has(sku)) {
        skippedNoParent++;
        continue;
      }

      const parentKitSku = componentToKit.get(sku)!;
      const expectedCollection = kitCollectionMap.get(parentKitSku) ?? null;

      if (!expectedCollection) {
        skippedNoCollection++;
        continue;
      }

      const currentCollection = product.collection ?? null;
      if (currentCollection === expectedCollection) {
        skippedNoChange++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({ collection: expectedCollection })
        .eq("id", product.id);

      if (updateError) {
        console.error(`  Error updating collection for ${sku}:`, updateError.message);
      } else {
        updated++;
      }
    }

    from += productsPage.length;
    console.log(`Processed ${processed} ACME products so far...`);
  }

  console.log(`\nResults:`);
  console.log(`  Updated components: ${updated}`);
  console.log(`  Skipped (no parent match): ${skippedNoParent}`);
  console.log(`  Skipped (parent collection missing): ${skippedNoCollection}`);
  console.log(`  Skipped (already correct): ${skippedNoChange}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

