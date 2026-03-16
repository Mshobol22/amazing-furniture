/**
 * Zinatex rug import script
 * Joins two CSVs on Variation SKU / SKU for authoritative inventory data.
 * Category hardcoded to 'rug', manufacturer hardcoded to 'Zinatex'.
 * Retail price used as-is (no markup — MSRP is the selling price).
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://exppyvqjqnnowtjgumfc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const MAIN_FILE = path.join('C:', 'Users', 'mshob', 'OneDrive', 'csv for AHF', 'zinat datasheet.csv');
const INV_FILE  = path.join('C:', 'Users', 'mshob', 'OneDrive', 'csv for AHF', 'zinat sku and inventory number.csv');
const BATCH_SIZE = 50;
const PLACEHOLDER = '/images/placeholder-product.jpg';
const URL_REGEX   = /^https?:\/\/.+/;
const ADD_IMG_COLS = ['ADDITIONAL IMAGE 1','ADDITIONAL IMAGE 2','ADDITIONAL IMAGE 3',
  'ADDITIONAL IMAGE 4','ADDITIONAL IMAGE 5','ADDITIONAL IMAGE 6','ADDITIONAL IMAGE 7',
  'ADDITIONAL IMAGE 8','ADDITIONAL IMAGE 9','ADDITIONAL IMAGE 10'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function s(v) { return (v || '').toString().trim(); }

function generateSlug(title, sku) {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
  const safeSku = sku.toLowerCase()
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base}-ztx-${safeSku}`;
}

/** Parse SIZE field: "10x13 (9'2"x12'5")" → {size, display} */
function parseDimensions(raw) {
  const str = s(raw);
  if (!str) return null;
  const parenMatch = str.match(/\(([^)]+)\)/);
  const sizeCode = str.split('(')[0].trim().replace(/\s+/g, ' ');
  return {
    size: sizeCode,
    display: parenMatch ? parenMatch[1] : sizeCode,
  };
}

function parseImages(row) {
  const imgs = [];
  const main = s(row['MAIN IMAGE']);
  if (main && URL_REGEX.test(main)) imgs.push(main);
  for (const col of ADD_IMG_COLS) {
    const u = s(row[col]);
    if (u && URL_REGEX.test(u)) imgs.push(u);
  }
  return imgs.length > 0 ? imgs : [PLACEHOLDER];
}

// ── Main ───────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Step 1: Read both files ────────────────────────────────────────────────────
console.log('Reading files…');
const mainRows = Papa.parse(fs.readFileSync(MAIN_FILE, 'utf8'), { header: true, skipEmptyLines: true }).data;
const invRows  = Papa.parse(fs.readFileSync(INV_FILE,  'utf8'), { header: true, skipEmptyLines: true }).data;

console.log(`Main file rows:      ${mainRows.length}`);
console.log(`Inventory file rows: ${invRows.length}`);

// ── Step 2: Build inventory map (SKU → quantity) ───────────────────────────────
const invMap = new Map();
invRows.forEach(r => {
  const sku = s(r['SKU']);
  const qty = Number(r['QUANTITY ON HAND']) || 0;
  if (sku) invMap.set(sku, qty);
});

// ── Step 3: Fetch existing SKUs from DB (paginated) ───────────────────────────
console.log('Fetching existing SKUs from DB…');
const existingSkus = new Set();
let page = 0;
const PAGE = 1000;
while (true) {
  const { data } = await supabase.from('products').select('sku').not('sku', 'is', null)
    .range(page * PAGE, (page + 1) * PAGE - 1);
  if (!data || data.length === 0) break;
  data.forEach(r => existingSkus.add(r.sku));
  if (data.length < PAGE) break;
  page++;
}
console.log(`Existing SKUs in DB: ${existingSkus.size}`);

const { count: existingZTX } = await supabase
  .from('products').select('id', { count: 'exact', head: true }).eq('manufacturer', 'Zinatex');
console.log(`Already in DB (Zinatex): ${existingZTX ?? 0}`);

// ── Step 4: Transform ──────────────────────────────────────────────────────────
let filteredPrice = 0, filteredNoName = 0, filteredNoSku = 0;
let skippedExisting = 0, dupeSku = 0, placeholders = 0;
let joinMatched = 0, joinNoMatch = 0;
const seenSkus = new Set();
const products = [];

for (const row of mainRows) {
  const sku   = s(row['Variation SKU']);
  const title = s(row['TITLE']);

  if (!sku)   { filteredNoSku++;  continue; }
  if (!title) { filteredNoName++; continue; }

  const price = Number(s(row['RETAIL PRICE / MSRP']));
  if (!isFinite(price) || price <= 0) { filteredPrice++; continue; }

  if (seenSkus.has(sku)) { dupeSku++; continue; }
  seenSkus.add(sku);

  if (existingSkus.has(sku)) { skippedExisting++; continue; }

  // ── Inventory join ───────────────────────────────────────────────────────────
  // Inventory file is authoritative. If not found → in_stock=false per spec.
  let inStock;
  if (invMap.has(sku)) {
    joinMatched++;
    inStock = invMap.get(sku) > 0;
  } else {
    joinNoMatch++;
    inStock = false;
  }

  // Images
  const images = parseImages(row);
  if (images[0] === PLACEHOLDER) placeholders++;

  products.push({
    name: title,
    slug: generateSlug(title, sku),
    description: s(row['DESCRIPTION']) || title,
    price: Math.round(price * 100) / 100,
    category: 'rug',              // hardcoded — not trusted from CSV
    sku,
    images,
    manufacturer: 'Zinatex',     // hardcoded — not trusted from CSV
    color: (s(row['COLOR']) || '').slice(0, 100) || null,
    dimensions: parseDimensions(s(row['SIZE'])),
    in_stock: inStock,
    on_sale: false,
    rating: 0,
    review_count: 0,
    tags: [],
  });
}

console.log('\n=== TRANSFORM SUMMARY ===');
console.log(`  Ready to insert:         ${products.length}`);
console.log(`  Join matched (inv file): ${joinMatched}`);
console.log(`  Join no match → false:   ${joinNoMatch}`);
console.log(`  Filtered (bad price):    ${filteredPrice}`);
console.log(`  Filtered (no name):      ${filteredNoName}`);
console.log(`  Filtered (no SKU):       ${filteredNoSku}`);
console.log(`  Skipped (dupe SKU):      ${dupeSku}`);
console.log(`  Skipped (in DB):         ${skippedExisting}`);
console.log(`  Placeholder images:      ${placeholders}`);

// ── Step 5: Batch insert ───────────────────────────────────────────────────────
const batches = [];
for (let i = 0; i < products.length; i += BATCH_SIZE) batches.push(products.slice(i, i + BATCH_SIZE));

let totalInserted = 0, batchErrors = 0;
for (let i = 0; i < batches.length; i++) {
  const { error } = await supabase.from('products').insert(batches[i]);
  if (error) {
    console.error(`  ERROR batch ${i+1}/${batches.length}: ${error.message}`);
    batchErrors++;
  } else {
    totalInserted += batches[i].length;
    console.log(`  Batch ${i+1}/${batches.length} complete — ${batches[i].length} inserted`);
  }
}

// ── Step 6: Verification ───────────────────────────────────────────────────────
const { count: totalZTX } = await supabase
  .from('products').select('id', { count: 'exact', head: true }).eq('manufacturer', 'Zinatex');
const { count: inStockZTX } = await supabase
  .from('products').select('id', { count: 'exact', head: true })
  .eq('manufacturer', 'Zinatex').eq('in_stock', true);
const { data: priceData } = await supabase
  .from('products').select('price').eq('manufacturer', 'Zinatex');
const prices = (priceData || []).map(r => r.price);
const minP = prices.length ? Math.min(...prices).toFixed(2) : 'N/A';
const maxP = prices.length ? Math.max(...prices).toFixed(2) : 'N/A';

console.log('\n=== IMPORT COMPLETE ===');
console.log(`Rows in main file:         ${mainRows.length}`);
console.log(`Rows in inventory file:    ${invRows.length}`);
console.log(`Inserted this run:         ${totalInserted}`);
console.log(`Batch errors:              ${batchErrors}`);
console.log(`Placeholder images:        ${placeholders}`);
console.log(`Final DB count (Zinatex):  ${totalZTX}`);
console.log(`  In stock:                ${inStockZTX}`);
console.log(`  Out of stock:            ${(totalZTX || 0) - (inStockZTX || 0)}`);
console.log(`Price range:               $${minP} – $${maxP}`);
console.log(`Join match rate:           ${joinMatched}/${mainRows.length} (${Math.round(joinMatched/mainRows.length*100)}%)`);
