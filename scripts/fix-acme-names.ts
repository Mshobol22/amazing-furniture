/**
 * Fix ACME product names by reading human-readable descriptions from the ACME datasheet.
 *
 * - Updates name to title-cased description from the XLSX for any ACME product
 *   where trim(name) = trim(sku).
 * - Also sets display_name to the same value if it is currently null.
 * - Join key: sku column in DB <-> Item No. column in XLSX.
 * - Never touches non-ACME products.
 *
 * Preview (no DB writes):
 *   PowerShell: $env:DRY_RUN="true"; npx tsx scripts/fix-acme-names.ts
 *   bash:       DRY_RUN=true npx tsx scripts/fix-acme-names.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

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

/**
 * Title-case a string.
 * Finds the first alphabetic character in each whitespace-delimited token and
 * uppercases it, leaving every other character untouched. This preserves
 * abbreviations, parenthesised codes (e.g. "(T/F)", "(EK)"), punctuation-
 * prefixed tokens like "(slats", and mixed tokens like "W/drawer".
 * If the source value is already properly cased (as the ACME sheet is) this
 * is effectively a no-op that only handles leading-lowercase edge cases.
 */
function toTitleCase(str: string): string {
  return str
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      // Find the index of the first letter and uppercase it
      const idx = token.search(/[a-zA-Z]/);
      if (idx === -1) return token; // pure punctuation / numbers
      return (
        token.slice(0, idx) +
        token[idx]!.toUpperCase() +
        token.slice(idx + 1)
      );
    })
    .join("");
}

/** Read XLSX and return a map of SKU -> title-cased description. */
function buildSkuDescMap(): Map<string, string> {
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  }) as (unknown)[][];

  // Locate header indices defensively
  const headerRow = rows[0] as (string | null)[];
  const skuIdx = headerRow.findIndex(
    (h) => typeof h === "string" && h.trim() === "Item No."
  );
  const descIdx = headerRow.findIndex(
    (h) => typeof h === "string" && h.trim() === "Description"
  );

  if (skuIdx === -1) throw new Error("Cannot find 'Item No.' column in ACME datasheet");
  if (descIdx === -1) throw new Error("Cannot find 'Description' column in ACME datasheet");

  console.log(`SKU column index: ${skuIdx}, Description column index: ${descIdx}`);

  const map = new Map<string, string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const skuRaw = row[skuIdx];
    const descRaw = row[descIdx];

    if (!skuRaw || typeof skuRaw !== "string" || skuRaw.trim() === "") continue;
    if (!descRaw || typeof descRaw !== "string" || descRaw.trim() === "") continue;

    const sku = skuRaw.trim();
    const desc = toTitleCase(descRaw.trim());

    // Keep the first entry if a SKU appears on multiple rows
    if (!map.has(sku)) {
      map.set(sku, desc);
    }
  }

  return map;
}

type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  display_name: string | null;
};

/** Fetch all ACME products where trim(name) = trim(sku). */
async function fetchTargetProducts(): Promise<ProductRow[]> {
  const out: ProductRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, display_name")
      .eq("manufacturer", "ACME")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase fetch error:", error);
      process.exit(1);
    }

    const chunk = (data ?? []) as ProductRow[];
    for (const row of chunk) {
      if (row.sku && row.name.trim() === row.sku.trim()) {
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

  console.log("Reading ACME datasheet...");
  const skuDescMap = buildSkuDescMap();
  console.log(`Loaded ${skuDescMap.size} SKU -> description mappings.\n`);

  console.log("Fetching ACME products where name = sku...");
  const products = await fetchTargetProducts();
  console.log(`Found ${products.length} ACME products to evaluate.\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const sku = product.sku!.trim();
    const newName = skuDescMap.get(sku);

    if (!newName) {
      skipped++;
      continue;
    }

    const patch: { name: string; display_name?: string } = { name: newName };
    if (product.display_name === null) {
      patch.display_name = newName;
    }

    if (DRY_RUN) {
      const dnNote = patch.display_name ? " (+ display_name)" : "";
      console.log(`[DRY_RUN] (${sku}) -> name: ${JSON.stringify(newName)}${dnNote}`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", product.id);

    if (error) {
      console.error(`Update failed ${product.id} (${sku}):`, error.message);
      skipped++;
    } else {
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
