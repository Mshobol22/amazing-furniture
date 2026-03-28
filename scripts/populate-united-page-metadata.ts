/**
 * Reads United Furniture CSV and sets products.page_id + products.page_features
 * for rows where manufacturer = 'United Furniture', matched by SKU.
 *
 * Usage:
 *   npx tsx scripts/populate-united-page-metadata.ts
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 50;
const CSV_PATH = "C:\\Users\\mshob\\OneDrive\\csv for AHF\\united datasheet.csv";
const MANUFACTURER = "United Furniture";

const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type CsvRow = Record<string, string | undefined>;

function cleanCsvValue(v: string | undefined): string {
  return (v ?? "").toString().replace(/^"+|"+$/g, "").trim();
}

function normalizeHeaderKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Prefer exact "SKU", then any header that is exactly "sku" after normalize. */
function resolveSkuColumn(keys: string[]): string {
  const trimmed = keys.map((k) => k.trim());
  const byExact = trimmed.find((k) => k.toUpperCase() === "SKU");
  if (byExact) return byExact;
  const byNorm = keys.find((k) => normalizeHeaderKey(k) === "sku");
  if (byNorm) return byNorm;
  const vendor = keys.find((k) => /^vendor\s*sku$/i.test(k.trim()));
  if (vendor) return vendor;
  throw new Error('Could not find SKU column (expected header "SKU" or similar)');
}

/** Prefer "Page Features", then a header containing "Page Features", then "Features". */
function resolveFeaturesColumn(keys: string[]): string | null {
  const entries = keys.map((k) => ({ raw: k, norm: normalizeHeaderKey(k) }));
  const pageFeaturesExact = entries.find((e) => e.norm === "page features");
  if (pageFeaturesExact) return pageFeaturesExact.raw;
  const pageFeaturesSub = entries.find((e) => e.norm.includes("page features"));
  if (pageFeaturesSub) return pageFeaturesSub.raw;
  const featuresOnly = entries.find(
    (e) => e.norm === "features" || (e.norm.includes("features") && !/^item feature\b/.test(e.norm))
  );
  return featuresOnly?.raw ?? null;
}

function resolvePageIdColumn(keys: string[]): string | null {
  const entries = keys.map((k) => ({ raw: k, norm: normalizeHeaderKey(k) }));
  const exact = entries.find((e) => e.norm === "page id");
  if (exact) return exact.raw;
  const sub = entries.find((e) => e.norm.includes("page id"));
  return sub?.raw ?? null;
}

/**
 * Split feature text: newlines first, then common delimiters inside each line.
 */
function parseFeatureBullets(raw: string | undefined): string[] {
  const cleaned = cleanCsvValue(raw);
  if (!cleaned) return [];

  const out: string[] = [];
  const lines = cleaned.split(/\r?\n/);

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    let segments: string[];
    if (t.includes("|")) {
      segments = t.split("|").map((s) => s.trim());
    } else if (t.includes("•")) {
      segments = t.split("•").map((s) => s.trim());
    } else if (t.includes(";") && !/^https?:\/\//i.test(t)) {
      segments = t.split(";").map((s) => s.trim());
    } else {
      segments = [t];
    }

    for (const s of segments) {
      if (s) out.push(s);
    }
  }

  return out;
}

type UpdatePayload = {
  sku: string;
  page_id: string | null;
  page_features: string[] | null;
};

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRow[];

  if (rows.length === 0) {
    console.log("CSV has no rows.");
    return;
  }

  const headerKeys = Object.keys(rows[0]);
  const skuCol = resolveSkuColumn(headerKeys);
  const pageIdCol = resolvePageIdColumn(headerKeys);
  const featuresCol = resolveFeaturesColumn(headerKeys);

  if (!pageIdCol) {
    console.warn('No "Page ID" column found; page_id will be null for all rows.');
  }
  if (!featuresCol) {
    console.warn('No "Page Features" / Features column found; page_features will be null for all rows.');
  }

  const bySku = new Map<string, UpdatePayload>();

  for (const row of rows) {
    const sku = cleanCsvValue(row[skuCol]);
    if (!sku) continue;

    const pageIdRaw = pageIdCol ? cleanCsvValue(row[pageIdCol]) : "";
    const bullets = featuresCol ? parseFeatureBullets(row[featuresCol]) : [];

    bySku.set(sku, {
      sku,
      page_id: pageIdRaw || null,
      page_features: bullets.length > 0 ? bullets : null,
    });
  }

  const payloads = Array.from(bySku.values());
  console.log(`CSV rows with SKU: ${payloads.length} (deduped by SKU)`);

  let updated = 0;
  let noMatch = 0;
  let failed = 0;
  const errorSamples: string[] = [];

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const chunk = payloads.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map(async (p) => {
        const { data, error } = await supabase
          .from("products")
          .update({
            page_id: p.page_id,
            page_features: p.page_features,
          })
          .eq("sku", p.sku)
          .eq("manufacturer", MANUFACTURER)
          .select("id");

        if (error) {
          return { ok: false as const, sku: p.sku, error: error.message };
        }
        if (!data?.length) {
          return { ok: true as const, sku: p.sku, matched: false };
        }
        return { ok: true as const, sku: p.sku, matched: true };
      })
    );

    for (const r of results) {
      if (!r.ok) {
        failed += 1;
        if (errorSamples.length < 5) {
          errorSamples.push(`${r.sku}: ${r.error}`);
        }
        continue;
      }
      if (r.matched) updated += 1;
      else noMatch += 1;
    }
  }

  console.log(`Updated rows: ${updated}`);
  console.log(`SKUs with no matching United Furniture product: ${noMatch}`);
  if (failed > 0) {
    console.error(`Update API errors: ${failed}`);
    for (const line of errorSamples) {
      console.error(`  ${line}`);
    }
    if (failed > errorSamples.length) {
      console.error(`  …and ${failed - errorSamples.length} more`);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
