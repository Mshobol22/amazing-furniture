/**
 * Re-import selected Zinatex rug rows from the master datasheet (XLSX) into `products`.
 * Matches 12 design families; skips rows whose slug already exists (no upsert).
 *
 * Usage:
 *   npx tsx scripts/reimport-zinatex-deleted.ts
 *
 * 1. Set `DEBUG_HEADERS_FILE = true` or `ZINATEX_DEBUG_HEADERS=1` → prints headers + 5 sample rows, exits.
 * 2. DRY_RUN = true → match + would-insert (no writes).
 * 3. DRY_RUN = false → live insert.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { canonicalZinatexProductSlug } from "../lib/zinatex-slug";

// ─── Run mode ───────────────────────────────────────────────────────────────
/**
 * Set to `true` once to dump headers + samples (no DB), or run:
 *   PowerShell: `$env:ZINATEX_DEBUG_HEADERS='1'; npx tsx scripts/reimport-zinatex-deleted.ts`
 */
const DEBUG_HEADERS_FILE = false;
const DEBUG_HEADERS =
  DEBUG_HEADERS_FILE || process.env.ZINATEX_DEBUG_HEADERS === "1";

/** Set to `true` for match + would-insert only (no DB writes). */
const DRY_RUN = false;

const DATASHEET_PATH =
  process.env.ZINATEX_DATASHEET_PATH?.trim() ||
  path.join("C:", "Users", "mshob", "OneDrive", "csv for AHF", "zinat datasheet.xlsx");

const INV_CSV_PATH =
  process.env.ZINATEX_INVENTORY_CSV_PATH?.trim() ||
  path.join("C:", "Users", "mshob", "OneDrive", "csv for AHF", "zinat sku and inventory number.csv");

const URL_REGEX = /^https?:\/\/.+/i;

// Storefront uses slug `rug` (not `rugs`) for the rugs collection.
const CATEGORY = "rug";

type Row = Record<string, string>;

function s(v: unknown): string {
  return (v ?? "").toString().trim();
}

function normHeader(h: string): string {
  return String(h ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pickColumn(headers: string[], patterns: RegExp[]): string | null {
  for (const h of headers) {
    const n = normHeader(h);
    if (!n) continue;
    for (const re of patterns) {
      if (re.test(n)) return h;
    }
  }
  return null;
}

type ColumnMap = {
  title: string | null;
  sku: string | null;
  price: string | null;
  description: string | null;
  color: string | null;
  size: string | null;
  mainImage: string | null;
  additionalImageHeaders: string[];
};

function resolveColumns(headers: string[]): ColumnMap {
  const title =
    pickColumn(headers, [
      /^title$/,
      /product\s*name/,
      /^item\s*name$/,
      /^name$/,
      /rug\s*name/,
    ]) ?? null;

  const sku =
    pickColumn(headers, [/variation\s*sku/, /^sku$/, /item\s*sku/, /variant\s*sku/]) ??
    pickColumn(headers, [/parent\s*sku/]) ??
    null;

  const price =
    pickColumn(headers, [
      /retail.*price/,
      /msrp/,
      /^price$/,
      /list\s*price/,
      /retail/,
    ]) ?? null;

  const description =
    pickColumn(headers, [/^description$/, /long\s*description/, /product\s*description/]) ??
    null;

  const color = pickColumn(headers, [/^color$/, /^colour$/]) ?? null;

  const size = pickColumn(headers, [/^size$/, /rug\s*size/, /dimensions/]) ?? null;

  const mainImage =
    pickColumn(headers, [/^main\s*image$/, /^primary\s*image$/, /^image$/, /image\s*url/]) ??
    null;

  const additionalImageHeaders = headers.filter((h) =>
    /additional\s*image|^image\s*\d+$|^img\s*\d+$/i.test(normHeader(h))
  );

  return {
    title,
    sku,
    price,
    description,
    color,
    size,
    mainImage,
    additionalImageHeaders,
  };
}

function rowGet(row: Row, col: string | null): string {
  if (!col) return "";
  if (Object.prototype.hasOwnProperty.call(row, col)) return s(row[col]);
  const want = normHeader(col);
  for (const k of Object.keys(row)) {
    if (normHeader(k) === want) return s(row[k]);
  }
  return "";
}

/** Load first worksheet as string-keyed rows (trimmed headers). */
function loadDatasheetRows(xlsxPath: string): Row[] {
  const workbook = XLSX.readFile(xlsxPath, { cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);

  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length === 0) return [];

  const headerRow = matrix[0] as unknown[];
  const headers = headerRow.map((cell, i) => {
    const t = s(cell);
    return t || `__empty_${i}`;
  });

  const records: Row[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] as unknown[];
    const obj: Row = {};
    let any = false;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]!;
      const val = s(line[c]);
      obj[key] = val;
      if (val) any = true;
    }
    if (any) records.push(obj);
  }

  return records;
}

function debugPrintHeadersAndSamples(xlsxPath: string): void {
  const workbook = XLSX.readFile(xlsxPath, { cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.error("Workbook has no sheets.");
    process.exit(1);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`Missing sheet: ${sheetName}`);
    process.exit(1);
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerRow = (matrix[0] ?? []) as unknown[];
  const exactHeaders = headerRow.map((cell) => s(cell));

  console.log("Sheet:", sheetName);
  console.log("Column headers (row 1, exact strings):");
  console.log(JSON.stringify(exactHeaders, null, 2));

  const samples: Row[] = [];
  for (let r = 1; r <= 5 && r < matrix.length; r++) {
    const line = matrix[r] as unknown[];
    const obj: Row = {};
    for (let c = 0; c < exactHeaders.length; c++) {
      const key = exactHeaders[c] || `__col_${c}`;
      obj[key] = s(line[c]);
    }
    samples.push(obj);
  }

  console.log("\nFirst 5 data rows (as objects, JSON):");
  console.log(JSON.stringify(samples, null, 2));

  const colMap = resolveColumns(exactHeaders.filter(Boolean));
  console.log("\nResolved column map (heuristic picks):");
  console.log(JSON.stringify(colMap, null, 2));
}

/** Same as import-zinatex.mjs — parse SIZE → dimensions JSONB */
function parseDimensions(raw: string): Record<string, string> | null {
  const str = s(raw);
  if (!str) return null;
  const parenMatch = str.match(/\(([^)]+)\)/);
  const sizeCode = str.split("(")[0]!.trim().replace(/\s+/g, " ");
  return {
    size: sizeCode,
    display: parenMatch ? parenMatch[1]! : sizeCode,
  };
}

function splitImageTokens(cell: string): string[] {
  return s(cell)
    .split(/[|,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseImages(row: Row, cols: ColumnMap): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const pushUrl = (u: string) => {
    if (!URL_REGEX.test(u)) return;
    if (seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };

  if (cols.mainImage) {
    for (const token of splitImageTokens(rowGet(row, cols.mainImage))) pushUrl(token);
  }
  for (const col of cols.additionalImageHeaders) {
    for (const token of splitImageTokens(rowGet(row, col))) pushUrl(token);
  }

  return out;
}

function buildInventoryMap(invPath: string): Map<string, number> {
  const map = new Map<string, number>();
  if (!fs.existsSync(invPath)) return map;
  const raw = fs.readFileSync(invPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Row[];
  for (const r of rows) {
    const sku = s(r["SKU"]);
    if (!sku) continue;
    const qty = Number(s(r["QUANTITY ON HAND"]).replace(/,/g, "")) || 0;
    map.set(sku, qty);
  }
  return map;
}

function stockFromRow(row: Row): number | null {
  const keys = Object.keys(row);
  for (const k of keys) {
    const nk = normHeader(k);
    if (
      nk === "inventory" ||
      nk === "stock" ||
      nk === "qty" ||
      nk === "quantity" ||
      nk === "quantity on hand"
    ) {
      const n = Number(s(row[k]).replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function quantityOnHandFromRow(row: Row): number | null {
  for (const k of Object.keys(row)) {
    if (normHeader(k) === "quantity on hand") {
      const n = Number(s(row[k]).replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Prefer per-row QOH from the feed, then inventory CSV, then generic stock columns. */
function resolveInStock(row: Row, sku: string, invMap: Map<string, number>): boolean {
  const qoh = quantityOnHandFromRow(row);
  if (qoh !== null) return qoh > 0;
  if (invMap.has(sku)) return invMap.get(sku)! > 0;
  const fromRow = stockFromRow(row);
  if (fromRow !== null) return fromRow > 0;
  return false;
}

type DesignRule = {
  label: string;
  collection: string;
  match: (title: string, sku: string) => boolean;
};

/** Title contains every token (case-insensitive). */
function titleContainsAll(title: string, tokens: string[]): boolean {
  const t = title.toLowerCase();
  return tokens.every((x) => t.includes(x.toLowerCase()));
}

/**
 * SKU "contains" design number without matching inside a longer number (e.g. 301 vs 1301).
 * For num >= 1000, plain substring is used (common in Zinatex style keys).
 */
function skuContainsDesignNumber(sku: string, num: number): boolean {
  const s = sku.toLowerCase();
  const n = String(num);
  if (num >= 1000) return s.includes(n);
  return new RegExp(`(^|[^0-9])${num}([^0-9]|$)`).test(s);
}

/** Design number in free text (title) — avoids 301 inside 1301. */
function textContainsDesignNumber(text: string, num: number): boolean {
  const t = text.toLowerCase();
  const n = String(num);
  if (num >= 1000) return t.includes(n);
  return new RegExp(`(^|[^0-9])${num}([^0-9]|$)`).test(t);
}

/**
 * Flowers / Roses rows must include the collection name in TITLE (case-insensitive).
 * Otherwise flooring SKUs like TFSPC301 / TFSPC307 match on number alone.
 */
function matchFlowersDesign(title: string, sku: string, num: number): boolean {
  const t = title.toLowerCase();
  if (!t.includes("flowers")) return false;
  return (
    textContainsDesignNumber(t, num) ||
    skuContainsDesignNumber(sku, num) ||
    new RegExp(`flowers[^a-z0-9]*${num}|${num}[^a-z0-9]*flowers`, "i").test(sku)
  );
}

function matchRosesDesign(title: string, sku: string, num: number): boolean {
  const t = title.toLowerCase();
  if (!t.includes("roses")) return false;
  return (
    textContainsDesignNumber(t, num) ||
    skuContainsDesignNumber(sku, num) ||
    new RegExp(`roses[^a-z0-9]*${num}|${num}[^a-z0-9]*roses`, "i").test(sku)
  );
}

/**
 * Twelve target designs — broad matching on title + SKU for variant rows.
 */
const DESIGN_RULES: DesignRule[] = [
  {
    label: "PREMIUM 1052",
    collection: "PREMIUM",
    match: (title, sku) =>
      titleContainsAll(title, ["premium", "1052"]) || skuContainsDesignNumber(sku, 1052),
  },
  {
    label: "PREMIUM 1070",
    collection: "PREMIUM",
    match: (title, sku) =>
      titleContainsAll(title, ["premium", "1070"]) || skuContainsDesignNumber(sku, 1070),
  },
  {
    label: "PREMIUM 1099",
    collection: "PREMIUM",
    match: (title, sku) =>
      titleContainsAll(title, ["premium", "1099"]) || skuContainsDesignNumber(sku, 1099),
  },
  {
    label: "Flowers-301",
    collection: "FLOWERS",
    match: (title, sku) => matchFlowersDesign(title, sku, 301),
  },
  {
    label: "Flowers-303",
    collection: "FLOWERS",
    match: (title, sku) => matchFlowersDesign(title, sku, 303),
  },
  {
    label: "Flowers-304",
    collection: "FLOWERS",
    match: (title, sku) => matchFlowersDesign(title, sku, 304),
  },
  {
    label: "Flowers-305",
    collection: "FLOWERS",
    match: (title, sku) => matchFlowersDesign(title, sku, 305),
  },
  {
    label: "Flowers-3888",
    collection: "FLOWERS",
    match: (title, sku) => matchFlowersDesign(title, sku, 3888),
  },
  {
    label: "Roses-307",
    collection: "ROSES",
    match: (title, sku) => matchRosesDesign(title, sku, 307),
  },
  {
    label: "CABANA 9006",
    collection: "CABANA",
    match: (title, sku) =>
      titleContainsAll(title, ["cabana", "9006"]) || skuContainsDesignNumber(sku, 9006),
  },
  {
    label: "STAR 1108 Elephant",
    collection: "STAR",
    match: (title, sku) => {
      const t = title.toLowerCase();
      const sk = sku.toLowerCase();
      const hasStar = t.includes("star") || sk.includes("star");
      const hasElephant = t.includes("elephant") || sk.includes("elephant");
      const has1108 = t.includes("1108") || sk.includes("1108");
      return hasStar && has1108 && hasElephant;
    },
  },
  {
    label: "FAUX FUR 2X3",
    collection: "FAUX FUR",
    match: (title, sku) => {
      const t = title.toLowerCase();
      const sk = sku.toLowerCase();
      const fur =
        (t.includes("faux") && t.includes("fur")) ||
        (sk.includes("faux") && sk.includes("fur"));
      const size =
        /\b2\s*x\s*3\b/i.test(t) ||
        /\b2x3\b/i.test(t) ||
        /\b2\s*x\s*3\b/i.test(sk) ||
        /\b2x3\b/i.test(sk);
      return fur && size;
    },
  },
];

function firstMatchingRule(title: string, sku: string): DesignRule | null {
  for (const rule of DESIGN_RULES) {
    if (rule.match(title, sku)) return rule;
  }
  return null;
}

async function main(): Promise<void> {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

  if (!fs.existsSync(DATASHEET_PATH)) {
    console.error(`Datasheet not found: ${DATASHEET_PATH}`);
    process.exit(1);
  }

  if (DEBUG_HEADERS) {
    console.log(`DEBUG_HEADERS  file=${DATASHEET_PATH}\n`);
    debugPrintHeadersAndSamples(DATASHEET_PATH);
    process.exit(0);
  }

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

  const records = loadDatasheetRows(DATASHEET_PATH);
  const headers = records.length > 0 ? Object.keys(records[0]!) : [];
  const colMap = resolveColumns(headers);

  if (!colMap.title || !colMap.sku) {
    console.error(
      "Could not resolve title and/or SKU columns from headers. Run with DEBUG_HEADERS = true and extend resolveColumns() patterns."
    );
    console.error("Headers:", headers);
    console.error("Resolved:", colMap);
    process.exit(1);
  }

  const invMap = buildInventoryMap(INV_CSV_PATH);
  if (invMap.size === 0 && fs.existsSync(INV_CSV_PATH)) {
    console.warn(`Inventory file parsed but no SKU rows: ${INV_CSV_PATH}`);
  } else if (!fs.existsSync(INV_CSV_PATH)) {
    console.warn(`No inventory CSV at ${INV_CSV_PATH} — using row stock columns or in_stock=false`);
  }

  let totalMatched = 0;
  let skippedSlug = 0;
  let inserted = 0;
  let insertErrors = 0;
  let noImageCount = 0;
  const noImageSamples: string[] = [];

  console.log(`\nreimport-zinatex-deleted  DRY_RUN=${DRY_RUN}`);
  console.log("=".repeat(60));
  console.log(`Datasheet: ${DATASHEET_PATH}`);
  console.log(`Rows loaded: ${records.length}`);
  console.log(`Column map: title=${colMap.title} sku=${colMap.sku} price=${colMap.price}`);
  console.log(`Inventory map size: ${invMap.size}\n`);

  /** Canonical slug shared by variant rows — skip repeats without re-querying DB. */
  const slugSeenThisRun = new Set<string>();

  for (const row of records) {
    const title = rowGet(row, colMap.title);
    const sku = rowGet(row, colMap.sku);
    const priceRaw = rowGet(row, colMap.price);
    const price = Number(priceRaw.replace(/,/g, ""));

    const rule = firstMatchingRule(title, sku);
    if (!rule) continue;

    if (!sku || !title) continue;
    if (!Number.isFinite(price) || price <= 0) {
      console.warn(`[skip bad price] design=${rule.label} sku=${sku} title=${title}`);
      continue;
    }

    totalMatched++;

    const slug = canonicalZinatexProductSlug(title, sku);
    const images = parseImages(row, colMap);
    const hasImages = images.length > 0;
    if (!hasImages) {
      noImageCount++;
      if (noImageSamples.length < 15) {
        noImageSamples.push(`${slug} (sku ${sku})`);
      }
    }

    if (slugSeenThisRun.has(slug)) {
      skippedSlug++;
      console.log(`[skipped — slug already handled in this run] ${slug} (sku ${sku})`);
      continue;
    }

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      skippedSlug++;
      slugSeenThisRun.add(slug);
      console.log(`[skipped — slug exists] ${slug}`);
      continue;
    }

    slugSeenThisRun.add(slug);

    const inStock = resolveInStock(row, sku, invMap);
    const description = colMap.description
      ? rowGet(row, colMap.description) || title
      : title;
    const colorCell = colMap.color ? rowGet(row, colMap.color).slice(0, 100) : "";
    const dimensions = colMap.size ? parseDimensions(rowGet(row, colMap.size)) : null;

    const payload = {
      name: title,
      slug,
      description,
      price: Math.round(price * 100) / 100,
      compare_at_price: Math.round(price * 100) / 100,
      sale_price: null as number | null,
      on_sale: false,
      images,
      category: CATEGORY,
      sku,
      manufacturer: "Zinatex",
      collection: rule.collection,
      color: colorCell || null,
      dimensions,
      in_stock: inStock,
      has_variants: false,
      variant_type: null as string | null,
      rating: 0,
      review_count: 0,
      tags: [] as string[],
    };

    const line = `[${DRY_RUN ? "would insert" : "insert"}] design=${rule.label} slug=${slug} sku=${sku} price=${payload.price} collection=${rule.collection} in_stock=${inStock} images=${images.length}`;
    console.log(line);

    if (DRY_RUN) continue;

    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      insertErrors++;
      console.error(`[insert error] ${slug}: ${error.message}`);
      continue;
    }
    inserted++;
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total rows matched (target designs):     ${totalMatched}`);
  console.log(`Skipped (slug already in products):      ${skippedSlug}`);
  console.log(
    DRY_RUN
      ? `Would insert (set DRY_RUN=false):       ${totalMatched - skippedSlug}`
      : `Rows inserted:                           ${inserted}`
  );
  if (!DRY_RUN && insertErrors > 0) {
    console.log(`Insert errors:                             ${insertErrors}`);
  }
  console.log(`Rows with no image URL in datasheet:     ${noImageCount}`);
  if (noImageSamples.length > 0) {
    console.log("Sample slugs with no images (up to 15):");
    for (const x of noImageSamples) console.log(`  - ${x}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
