/**
 * United Furniture product import script
 * Reads united datasheet.csv and inserts into Supabase products table.
 * Safe to re-run — pre-fetches existing SKUs and skips duplicates.
 *
 * Notes from audit:
 *  - MAP column is empty for ALL rows — MSRP used as price
 *  - Sub-Category column is empty for all rows
 *  - Inventory 2-10 columns are empty for all rows (only Inventory column has data)
 *  - All values in MSRP/Wholesale are quoted strings: strip " before parsing
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://exppyvqjqnnowtjgumfc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const FILE_PATH = path.join('C:', 'Users', 'mshob', 'OneDrive', 'csv for AHF', 'united datasheet.csv');
const BATCH_SIZE = 50;
const PLACEHOLDER_IMAGE = '/images/placeholder-product.jpg';
const URL_REGEX = /^https?:\/\/.+/;
const INV_COLS = ['Inventory','Inventory 2','Inventory 3','Inventory 4','Inventory 5',
                  'Inventory 6','Inventory 7','Inventory 8','Inventory 9','Inventory 10'];

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Strip surrounding quotes and whitespace from CSV string values */
function clean(v) {
  return (v || '').toString().replace(/^"+|"+$/g, '').trim();
}

/** Parse a numeric CSV value safely */
function parseNum(v) {
  const n = Number(clean(v));
  return isFinite(n) ? n : 0;
}

/** Category mapping: United → our schema */
function mapCategory(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (s === 'supplies') return null;          // skip
  if (s === 'bedrooms' || s === 'glamour' || s === 'bunk beds' || s === 'day beds') return 'bed';
  if (s === 'living rooms') return 'sofa';
  if (s === 'dining rooms' || s === 'bars' || s === 'occasional') return 'table';
  if (s === 'stools' || s === 'accents' || s === 'accessories') return 'chair';
  return 'table'; // safe fallback
}

/** Slug: lowercase name, hyphens, strip specials, suffix -uf-[sku] */
function generateSlug(name, sku) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  const safeSku = sku.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base}-uf-${safeSku}`;
}

/** Parse " | " separated image URLs, return valid-only array */
function parseImages(raw) {
  const cleaned = clean(raw);
  if (!cleaned) return [];
  return cleaned
    .split('|')
    .map(u => u.trim())
    .filter(u => u && URL_REGEX.test(u));
}

// ── Main ───────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('Reading CSV file…');
const raw = fs.readFileSync(FILE_PATH, 'utf8');
const allRows = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, trim: true });
console.log(`Total rows in file: ${allRows.length}`);

// ── Fetch existing SKUs ────────────────────────────────────────────────────────
console.log('Fetching existing SKUs from DB…');
const { data: existingRows } = await supabase
  .from('products')
  .select('sku')
  .not('sku', 'is', null);
const existingSkus = new Set((existingRows || []).map(r => r.sku));
console.log(`Existing SKUs in DB: ${existingSkus.size}`);

const { count: existingUFCount } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('manufacturer', 'United Furniture');
console.log(`Already in Supabase (United Furniture): ${existingUFCount ?? 0}`);

// ── Transform + filter rows ────────────────────────────────────────────────────
const seenSkus = new Set();
let filteredSupplies = 0, filteredStatus = 0, filteredPrice = 0,
    filteredNoName = 0, filteredDupeSku = 0, skippedExisting = 0,
    placeholderCount = 0;

const products = [];

for (const row of allRows) {
  const name = clean(row['Item Name']);
  const sku  = clean(row['SKU']);
  const rawCategory = clean(row['Category']);
  const status = clean(row['Item Status']);

  // Filter: no name
  if (!name) { filteredNoName++; continue; }

  // Filter: Supplies category
  const category = mapCategory(rawCategory);
  if (category === null) { filteredSupplies++; continue; }

  // Filter: Discontinued / Inactive / Parts
  if (['Discontinued', 'Inactive', 'Parts'].includes(status)) { filteredStatus++; continue; }

  // Price: MAP is always empty; use MSRP
  const price = parseNum(row['MSRP']);
  if (!isFinite(price) || price <= 0) { filteredPrice++; continue; }

  // Wholesale price intentionally excluded from insert
  // compare_at_price: not applicable (MAP empty, MSRP is already the price)

  // SKU dedup within file
  const skuKey = sku || name; // fallback to name if no SKU
  if (seenSkus.has(skuKey)) { filteredDupeSku++; continue; }
  seenSkus.add(skuKey);

  // Skip if already in DB
  if (sku && existingSkus.has(sku)) { skippedExisting++; continue; }

  // Inventory: sum all inv columns
  const totalInv = INV_COLS.reduce((sum, c) => sum + parseNum(row[c]), 0);
  const inStock = totalInv > 0;

  // Images
  const images = parseImages(row['Image Urls']);
  if (images.length === 0) {
    images.push(PLACEHOLDER_IMAGE);
    placeholderCount++;
  }

  // Dimensions JSONB
  const len = parseNum(row['Item Length']);
  const wid = parseNum(row['Item Width']);
  const hgt = parseNum(row['Item Height']);
  const dimensions = (len || wid || hgt)
    ? { length: len || null, width: wid || null, height: hgt || null, unit: 'inches' }
    : null;

  // Description
  const description = clean(row['Item Long Description']) || clean(row['Item Short Description']) || name;

  products.push({
    name,
    slug: generateSlug(name, sku || name),
    description,
    price: Math.round(price * 100) / 100,
    category,
    sku: sku || null,
    images,
    manufacturer: 'United Furniture',
    collection: clean(row['Collection']) || null,
    color: clean(row['Item Color']) || null,
    material: clean(row['Material']) || null,
    dimensions,
    in_stock: inStock,
    on_sale: false,
    rating: 0,
    review_count: 0,
    tags: [],
  });
}

console.log(`\nTransform summary:`);
console.log(`  Ready to insert:      ${products.length}`);
console.log(`  Filtered (supplies):  ${filteredSupplies}`);
console.log(`  Filtered (status):    ${filteredStatus}`);
console.log(`  Filtered (no name):   ${filteredNoName}`);
console.log(`  Filtered (bad price): ${filteredPrice}`);
console.log(`  Filtered (dupe SKU):  ${filteredDupeSku}`);
console.log(`  Skipped (in DB):      ${skippedExisting}`);
console.log(`  Placeholder images:   ${placeholderCount}`);

// ── Batch insert ────────────────────────────────────────────────────────────────
const batches = [];
for (let i = 0; i < products.length; i += BATCH_SIZE) {
  batches.push(products.slice(i, i + BATCH_SIZE));
}

let totalInserted = 0, batchErrors = 0;
for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  const { error } = await supabase.from('products').insert(batch);
  if (error) {
    console.error(`  ERROR batch ${i + 1}/${batches.length}: ${error.message}`);
    batchErrors++;
  } else {
    totalInserted += batch.length;
    console.log(`  Batch ${i + 1}/${batches.length} complete — ${batch.length} inserted`);
  }
}

// ── Final verification ─────────────────────────────────────────────────────────
const { count: finalCount } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('manufacturer', 'United Furniture');

const { data: priceStats } = await supabase
  .from('products')
  .select('price')
  .eq('manufacturer', 'United Furniture');

const prices = (priceStats || []).map(r => r.price);
const minP = prices.length ? Math.min(...prices).toFixed(2) : 'N/A';
const maxP = prices.length ? Math.max(...prices).toFixed(2) : 'N/A';
const avgP = prices.length ? (prices.reduce((a,b) => a+b, 0) / prices.length).toFixed(2) : 'N/A';

console.log('\n=== IMPORT COMPLETE ===');
console.log(`Total rows in file:       ${allRows.length}`);
console.log(`Inserted this run:        ${totalInserted}`);
console.log(`Skipped (already in DB):  ${skippedExisting}`);
console.log(`Batch errors:             ${batchErrors}`);
console.log(`Placeholder images used:  ${placeholderCount}`);
console.log(`Final DB count (UF):      ${finalCount}`);
console.log(`Price range:              $${minP} – $${maxP} (avg $${avgP})`);
