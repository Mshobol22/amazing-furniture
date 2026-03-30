/**
 * Import missing ACME Singles / KITs / Single-Additional rows from the ACME master XLSX
 * into `products` (idempotent by SKU). Skips Components.
 *
 * Usage:
 *   npx tsx scripts/import-acme-missing-products.ts
 *
 * Toggle DRY_RUN below before a real run.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as xlsx from "xlsx";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Run mode ───────────────────────────────────────────────────────────────
/** Set to `false` after reviewing dry-run output. */
const DRY_RUN = false;

const XLSX_PATH =
  process.env.ACME_IMPORT_XLSX_PATH?.trim() ||
  "C:\\Users\\mshob\\OneDrive\\csv for AHF\\acme datasheet.xlsx";

const BATCH_SIZE = 100;

// ─── Env ─────────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

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

// ─── Category mapping (CAT code → products.category) ────────────────────────
// Spec lists marketing-style labels (e.g. "beds"); the storefront uses these DB slugs
// (see `applyStorefrontCollectionCategoryFilter` / collections/[category]).
const CAT_TO_CATEGORY: Record<string, string> = {
  BED: "bed",
  BDR: "bedroom-furniture",
  REC: "chair",
  SOF: "sofa",
  DIN: "table",
  OCC: "table",
  ENT: "tv-stand",
  OFF: "other",
  KID: "bed",
  YTH: "bed",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type AcmeProductType = "single" | "kit" | "single_additional";

type ParsedRow = {
  sku: string;
  displayName: string;
  acmeProductType: AcmeProductType;
  westPrice: number | null;
  collection: string;
  finish: string;
  catalogSize: string;
  romance: string;
  productDetails: string;
  catRaw: string;
  category: string;
  imageCell: string;
  style: string;
  material: string;
};

type InsertRow = ParsedRow & {
  slug: string;
  price: number;
  images: string[];
  description: string;
  acme_color_group: string | null;
};

// ─── Column resolution ───────────────────────────────────────────────────────

function normHeader(h: string): string {
  return String(h ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pickColumn(headers: string[], patterns: RegExp[]): string | null {
  const n = headers.map(normHeader);
  for (let i = 0; i < n.length; i++) {
    for (const re of patterns) {
      if (re.test(n[i])) return headers[i];
    }
  }
  return null;
}

/** Avoid matching "Catalog Finish" etc. — CAT is usually "CAT" or "CAT (Category Web & Macolab)". */
function pickCatColumn(headers: string[]): string | null {
  for (const h of headers) {
    const n = normHeader(h);
    if (/category web.*macolab/.test(n)) return h;
  }
  for (const h of headers) {
    const n = normHeader(h);
    if (n === "cat" || /^cat\s*\(/.test(n)) return h;
  }
  return null;
}

function getCell(row: Record<string, unknown>, col: string | null): unknown {
  if (!col) return "";
  if (Object.prototype.hasOwnProperty.call(row, col)) return row[col];
  const keys = Object.keys(row);
  const want = normHeader(col);
  for (const k of keys) {
    if (normHeader(k) === want) return row[k];
  }
  return "";
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Slugify: lowercase, non-alphanumeric → hyphen, collapse, trim. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCatCode(raw: string): string {
  let s = str(raw);
  if (!s) return "";
  for (const sep of ["•", "–", "-"]) {
    if (s.includes(sep)) {
      s = s.split(sep).pop()!.trim();
      break;
    }
  }
  if (s.includes("/")) s = s.split("/")[0]!.trim();
  const token = s.split(/\s+/).pop() ?? s;
  return token.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function mapCategory(catRaw: string): string {
  const code = normalizeCatCode(catRaw);
  if (!code) return "other";
  return CAT_TO_CATEGORY[code] ?? "other";
}

function mapProductType(raw: string): AcmeProductType | "component" | null {
  const t = str(raw).toLowerCase().replace(/\s+/g, " ");
  if (t === "single") return "single";
  if (t === "kit") return "kit";
  if (t === "single-additional" || t === "single additional")
    return "single_additional";
  if (t === "components" || t === "component") return "component";
  return null;
}

function parseWestPrice(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v).replace(/[$,\s]/g, "").trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function acmeRetailPrice(west: number | null): number | null {
  if (west == null) return null;
  return Math.round((west * 2.5 + 300) * 100) / 100;
}

function parseImages(cell: string): string[] {
  if (!cell) return [];
  const parts = cell.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.startsWith("https://")) out.push(p);
  }
  return out;
}

function buildBaseSlug(displayName: string, sku: string): string {
  const namePart = slugify(displayName).slice(0, 80).replace(/-$/, "");
  const skuPart = slugify(sku);
  return `${namePart}-acme-${skuPart}`;
}

async function fetchAllAcmeSkus(client: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("products")
      .select("sku")
      .eq("manufacturer", "ACME")
      .not("sku", "is", null)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`fetch ACME skus: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      const s = str(r.sku);
      if (s) set.add(s);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return set;
}

async function fetchAllSlugs(client: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("products")
      .select("slug")
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`fetch slugs: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      const s = str(r.slug);
      if (s) set.add(s);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return set;
}

type AcmeExistingRow = {
  id: string;
  collection: string | null;
  display_name: string | null;
  acme_color_group: string | null;
};

async function fetchAllAcmeForColorGroup(
  client: SupabaseClient
): Promise<AcmeExistingRow[]> {
  const out: AcmeExistingRow[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("products")
      .select("id, collection, display_name, acme_color_group")
      .eq("manufacturer", "ACME")
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`fetch ACME color rows: ${error.message}`);
    const rows = data ?? [];
    out.push(...(rows as AcmeExistingRow[]));
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function colorGroupKey(
  collection: string,
  displayName: string
): string | null {
  const c = str(collection);
  const d = str(displayName);
  if (!c || !d) return null;
  return `${slugify(c)}_${slugify(d)}`;
}

function assignUniqueSlug(base: string, reserved: Set<string>): string {
  let s = base;
  let n = 2;
  while (reserved.has(s)) {
    s = `${base}-${n}`;
    n++;
  }
  reserved.add(s);
  return s;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`DRY_RUN=${DRY_RUN}`);
  console.log("Reading:", XLSX_PATH);

  const wb = xlsx.readFile(XLSX_PATH, { cellDates: false });
  const sheetName = wb.SheetNames.includes("USE")
    ? "USE"
    : wb.SheetNames[0]!;
  const sheet = wb.Sheets[sheetName]!;
  console.log("Sheet:", sheetName);

  const headerMatrix = xlsx.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  const headerRow = (headerMatrix[0] as unknown[]) || [];
  const headers = headerRow.map((h) => (h == null ? "" : String(h)));

  const colItem = pickColumn(headers, [/^item\s*no\.?$/i, /^item no/i]);
  const colDesc = pickColumn(headers, [/^description$/i]);
  const colType = pickColumn(headers, [/^product type$/i]);
  const colWest = pickColumn(headers, [/west\s*price/i]);
  const colColl = pickColumn(headers, [/^collection name$/i, /collection name/i]);
  const colFinish = pickColumn(headers, [/^catalog finish$/i, /catalog finish/i]);
  const colSize = pickColumn(headers, [/^catalog size$/i]);
  const colRomance = pickColumn(headers, [/^romance$/i]);
  const colDet = pickColumn(headers, [/^product details$/i]);
  const colCat = pickCatColumn(headers);
  const colImg = pickColumn(headers, [/all product image url/i, /product image url/i]);
  const colStyle = pickColumn(headers, [/^style$/i]);
  const colMat = pickColumn(headers, [/materials\s*\(website\)/i, /^materials$/i]);

  const required = [colItem, colDesc, colType, colWest];
  if (required.some((c) => !c)) {
    console.error("Missing required columns. Found headers:", headers);
    process.exit(1);
  }

  const objects = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  let sourceSingles = 0;
  let sourceKits = 0;
  let sourceSingleAdditional = 0;
  let skippedComponents = 0;
  let skippedOtherType = 0;
  let skippedNoSku = 0;

  const parsed: ParsedRow[] = [];

  for (const row of objects) {
    const sku = str(getCell(row, colItem!));
    const displayName = str(getCell(row, colDesc!));
    const typeRaw = str(getCell(row, colType!));
    const pt = mapProductType(typeRaw);

    if (typeRaw && /^components?$/i.test(typeRaw.trim())) {
      skippedComponents++;
      continue;
    }

    if (pt === "component") {
      skippedComponents++;
      continue;
    }

    if (pt === null) {
      if (typeRaw) skippedOtherType++;
      continue;
    }

    if (pt === "single") sourceSingles++;
    else if (pt === "kit") sourceKits++;
    else if (pt === "single_additional") sourceSingleAdditional++;

    if (!sku) {
      skippedNoSku++;
      continue;
    }

    const west = parseWestPrice(getCell(row, colWest!));
    const collection = str(getCell(row, colColl));
    const finish = colFinish ? str(getCell(row, colFinish)) : "";
    const catalogSize = colSize ? str(getCell(row, colSize)) : "";
    const romance = colRomance ? str(getCell(row, colRomance)) : "";
    const productDetails = colDet ? str(getCell(row, colDet)) : "";
    const catRaw = colCat ? str(getCell(row, colCat)) : "";
    const imageCell = colImg ? str(getCell(row, colImg)) : "";
    const style = colStyle ? str(getCell(row, colStyle)) : "";
    const material = colMat ? str(getCell(row, colMat)) : "";

    parsed.push({
      sku,
      displayName,
      acmeProductType: pt,
      westPrice: west,
      collection,
      finish,
      catalogSize,
      romance,
      productDetails,
      catRaw,
      category: mapCategory(catRaw),
      imageCell,
      style,
      material,
    });
  }

  console.log("\n--- Source file ---");
  console.log(`Total Singles (Product Type = Single):     ${sourceSingles}`);
  console.log(`Total KITs:                                 ${sourceKits}`);
  console.log(`Total Single-Additional:                    ${sourceSingleAdditional}`);
  console.log(`Skipped (Components):                       ${skippedComponents}`);
  console.log(`Skipped (other Product Type):               ${skippedOtherType}`);
  console.log(`Skipped (no Item No.):                      ${skippedNoSku}`);

  const existingSkus = await fetchAllAcmeSkus(supabase);
  const slugReserved = await fetchAllSlugs(supabase);

  const missing = parsed.filter((p) => !existingSkus.has(p.sku));
  const skippedInDb = parsed.length - missing.length;

  const insertErrors: string[] = [];
  const toInsert: InsertRow[] = [];

  for (const p of missing) {
    const price = acmeRetailPrice(p.westPrice);
    if (price == null) {
      insertErrors.push(`${p.sku} (invalid West Price)`);
      continue;
    }

    const images = parseImages(p.imageCell);
    const baseSlug = buildBaseSlug(p.displayName || p.sku, p.sku);
    const slug = assignUniqueSlug(baseSlug, slugReserved);

    toInsert.push({
      ...p,
      slug,
      price,
      images,
      description: p.romance || "",
      acme_color_group: null,
    });
  }

  const existingAcme = await fetchAllAcmeForColorGroup(supabase);

  const keyToExistingIds = new Map<string, string[]>();
  for (const r of existingAcme) {
    const k = colorGroupKey(str(r.collection), str(r.display_name));
    if (!k) continue;
    const arr = keyToExistingIds.get(k) ?? [];
    arr.push(r.id);
    keyToExistingIds.set(k, arr);
  }

  const keyToNewRows = new Map<string, InsertRow[]>();
  for (const row of toInsert) {
    const k = colorGroupKey(row.collection, row.displayName);
    if (!k) continue;
    const arr = keyToNewRows.get(k) ?? [];
    arr.push(row);
    keyToNewRows.set(k, arr);
  }

  let colorGroupsTouched = 0;

  for (const [k, newRows] of keyToNewRows) {
    const existingCount = keyToExistingIds.get(k)?.length ?? 0;
    const total = existingCount + newRows.length;
    if (total < 2) continue;

    colorGroupsTouched += newRows.length;
    for (const r of newRows) r.acme_color_group = k;
  }

  const existingIdsToSetGroup: { id: string; acme_color_group: string }[] = [];
  for (const [k, newRows] of keyToNewRows) {
    const existingCount = keyToExistingIds.get(k)?.length ?? 0;
    if (existingCount + newRows.length < 2) continue;
    for (const id of keyToExistingIds.get(k) ?? []) {
      const row = existingAcme.find((x) => x.id === id);
      if (row && (row.acme_color_group == null || str(row.acme_color_group) === "")) {
        existingIdsToSetGroup.push({ id, acme_color_group: k });
      }
    }
  }

  const newSingles = toInsert.filter(
    (r) => r.acmeProductType === "single" || r.acmeProductType === "single_additional"
  ).length;
  const newKits = toInsert.filter((r) => r.acmeProductType === "kit").length;

  console.log("\n--- vs database ---");
  console.log(`Already in DB (skipped):                    ${skippedInDb}`);
  console.log(`New rows ready (after price validation):     ${toInsert.length}`);
  console.log(`  → Singles:                                ${newSingles}`);
  console.log(`  → KITs:                                   ${newKits}`);
  console.log(
    `  → Single-Additional (subset of Singles):  ${toInsert.filter((r) => r.acmeProductType === "single_additional").length}`
  );
  console.log(`Color groups assigned (new rows):           ${colorGroupsTouched}`);
  console.log(`Existing rows to backfill acme_color_group: ${existingIdsToSetGroup.length}`);

  if (DRY_RUN) {
    console.log("\n[DRY_RUN] No database writes.");
    if (toInsert.length) {
      console.log("Sample rows (up to 3):");
      for (const r of toInsert.slice(0, 3)) {
        console.log(
          `  ${r.sku} | ${r.slug} | $${r.price} | ${r.acmeProductType} | cat=${r.category}`
        );
      }
    }
    printReport({
      sourceSingles,
      sourceKits,
      skippedInDb,
      newSingles,
      newKits,
      colorGroupsTouched: colorGroupsTouched + existingIdsToSetGroup.length,
      componentsLinked: 0,
      insertErrors,
    });
    return;
  }

  // ─── Inserts ───────────────────────────────────────────────────────────────
  let insertedSingles = 0;
  let insertedKits = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const payload = batch.map((r) => ({
      name: r.sku,
      sku: r.sku,
      slug: r.slug,
      display_name: r.displayName || null,
      description: r.description,
      price: r.price,
      images: r.images,
      category: r.category,
      manufacturer: "ACME",
      acme_product_type: r.acmeProductType,
      collection: r.collection || null,
      finish: r.finish || null,
      catalog_size: r.catalogSize || null,
      product_details: r.productDetails || null,
      material: r.material || null,
      style: r.style || null,
      in_stock: true,
      on_sale: false,
      compare_at_price: null,
      warranty: null,
      rating: 0,
      review_count: 0,
      tags: [] as string[],
      acme_color_group: r.acme_color_group,
      acme_kit_parent_sku: null,
    }));

    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      for (const row of batch) {
        const one = payload.find((p) => p.sku === row.sku)!;
        const { error: e2 } = await supabase.from("products").insert([one]);
        if (e2) insertErrors.push(`${row.sku}: ${e2.message}`);
        else {
          if (
            row.acmeProductType === "single" ||
            row.acmeProductType === "single_additional"
          )
            insertedSingles++;
          else if (row.acmeProductType === "kit") insertedKits++;
        }
      }
    } else {
      for (const row of batch) {
        if (
          row.acmeProductType === "single" ||
          row.acmeProductType === "single_additional"
        )
          insertedSingles++;
        else if (row.acmeProductType === "kit") insertedKits++;
      }
    }
  }

  // ─── Backfill acme_color_group on existing rows ────────────────────────────
  let colorBackfillCount = 0;
  for (let i = 0; i < existingIdsToSetGroup.length; i += BATCH_SIZE) {
    const chunk = existingIdsToSetGroup.slice(i, i + BATCH_SIZE);
    for (const { id, acme_color_group } of chunk) {
      const { error } = await supabase
        .from("products")
        .update({ acme_color_group })
        .eq("id", id);
      if (error) {
        console.error(`Color backfill failed id=${id}:`, error.message);
      } else {
        colorBackfillCount++;
      }
    }
  }

  // ─── Link components → KIT parents (same SQL semantics, longest kit prefix) ─
  const { data: kits, error: kitErr } = await supabase
    .from("products")
    .select("sku, collection")
    .eq("manufacturer", "ACME")
    .eq("acme_product_type", "kit");

  if (kitErr) {
    console.error("Failed to load KIT rows:", kitErr.message);
    process.exit(1);
  }

  const kitList = (kits ?? [])
    .map((r) => ({
      sku: str(r.sku),
      collection: str(r.collection),
    }))
    .filter((k) => k.sku);

  const pageSize = 500;
  let from = 0;
  let componentsLinked = 0;

  for (;;) {
    const { data: comps, error: cErr } = await supabase
      .from("products")
      .select("id, sku, collection")
      .eq("manufacturer", "ACME")
      .eq("acme_product_type", "component")
      .is("acme_kit_parent_sku", null)
      .order("id")
      .range(from, from + pageSize - 1);

    if (cErr) {
      console.error("Failed to load components:", cErr.message);
      process.exit(1);
    }
    const page = comps ?? [];
    if (page.length === 0) break;

    for (const c of page) {
      const sku = str(c.sku);
      const coll = str(c.collection);
      if (!sku) continue;

      let bestKit = "";
      for (const k of kitList) {
        if (k.collection !== coll) continue;
        if (sku === k.sku) continue;
        if (!sku.startsWith(k.sku)) continue;
        if (k.sku.length > bestKit.length) bestKit = k.sku;
      }

      if (!bestKit) continue;

      const { error: uErr } = await supabase
        .from("products")
        .update({ acme_kit_parent_sku: bestKit })
        .eq("id", c.id);

      if (!uErr) componentsLinked++;
    }

    if (page.length < pageSize) break;
    from += pageSize;
  }

  printReport({
    sourceSingles,
    sourceKits,
    skippedInDb,
    newSingles: insertedSingles,
    newKits: insertedKits,
    colorGroupsTouched: colorGroupsTouched + colorBackfillCount,
    componentsLinked,
    insertErrors,
  });
}

function printReport(args: {
  sourceSingles: number;
  sourceKits: number;
  skippedInDb: number;
  newSingles: number;
  newKits: number;
  colorGroupsTouched: number;
  componentsLinked: number;
  insertErrors: string[];
}) {
  console.log("\n========== VERIFICATION REPORT ==========");
  console.log(`Total Singles in source:        ${args.sourceSingles}`);
  console.log(`Total KITs in source:           ${args.sourceKits}`);
  console.log(`Already in DB (skipped):        ${args.skippedInDb}`);
  console.log(`Newly inserted Singles:         ${args.newSingles}`);
  console.log(`Newly inserted KITs:            ${args.newKits}`);
  console.log(`Color groups created/updated:   ${args.colorGroupsTouched}`);
  console.log(`Components newly linked to KIT: ${args.componentsLinked}`);
  console.log(
    `Any insert errors:              ${args.insertErrors.length ? args.insertErrors.join("; ") : "(none)"}`
  );
  console.log("=========================================\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
