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

/** Leading style number only (99903-Beige-10x13 → 99903) — parent URL, not per-variant. */
function zinatexStyleKeyFromSku(sku) {
  const t = (sku || '').toString().trim();
  if (!t) return '';
  const first = t.split('-')[0] || '';
  if (/^\d+$/.test(first)) return first.toLowerCase();
  return t.toLowerCase()
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** One PDP slug per rug design; matches lib/zinatex-slug.ts canonicalZinatexProductSlug. */
function generateSlug(title, sku) {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
  const safeStyle = zinatexStyleKeyFromSku(sku);
  return `${base}-ztx-${safeStyle}`;
}

function groupKey(title, sku) {
  return `${title.trim().toLowerCase()}:::${zinatexStyleKeyFromSku(sku)}`;
}

function extractRawSize(sku) {
  const parts = (sku || '').toString().split('-');
  return parts[parts.length - 1] ?? '';
}

function normalizeSize(raw) {
  return raw.replace(/(\d+ft)([A-Z])/g, '$1 $2');
}

const VARIANT_SIZE_ORDER = {
  '2x4': 1, '2x8': 2, '4x6': 3, '5x8': 4, '7ft Round': 5, '7x10': 6, '8x11': 7, '10x13': 8,
};

function getVariantSortOrder(size) {
  if (!size) return 99;
  return VARIANT_SIZE_ORDER[size] ?? 99;
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

const { data: variantSkuRows } = await supabase.from('product_variants').select('sku');
const existingVariantSkus = new Set(
  (variantSkuRows ?? []).map((r) => r.sku).filter(Boolean)
);
console.log(`Existing variant SKUs in DB: ${existingVariantSkus.size}`);

const { count: existingZTX } = await supabase
  .from('products').select('id', { count: 'exact', head: true }).eq('manufacturer', 'Zinatex');
console.log(`Already in DB (Zinatex): ${existingZTX ?? 0}`);

// ── Step 4: Transform (group by title + style key → one parent + product_variants) ─
let filteredPrice = 0, filteredNoName = 0, filteredNoSku = 0;
let skippedExisting = 0, dupeSku = 0, placeholders = 0;
let joinMatched = 0, joinNoMatch = 0;
let skippedPartialGroup = 0;
const seenSkus = new Set();
const groups = new Map();

for (const row of mainRows) {
  const sku   = s(row['Variation SKU']);
  const title = s(row['TITLE']);

  if (!sku)   { filteredNoSku++;  continue; }
  if (!title) { filteredNoName++; continue; }

  const price = Number(s(row['RETAIL PRICE / MSRP']));
  if (!isFinite(price) || price <= 0) { filteredPrice++; continue; }

  if (seenSkus.has(sku)) { dupeSku++; continue; }
  seenSkus.add(sku);

  if (existingSkus.has(sku) || existingVariantSkus.has(sku)) {
    skippedExisting++;
    continue;
  }

  let inStock;
  if (invMap.has(sku)) {
    joinMatched++;
    inStock = invMap.get(sku) > 0;
  } else {
    joinNoMatch++;
    inStock = false;
  }

  const images = parseImages(row);
  if (images[0] === PLACEHOLDER) placeholders++;

  const key = groupKey(title, sku);
  const bucket = groups.get(key) ?? [];
  bucket.push({
    title,
    sku,
    price: Math.round(price * 100) / 100,
    inStock,
    images,
    color: (s(row['COLOR']) || '').slice(0, 100) || null,
    dimensions: parseDimensions(s(row['SIZE'])),
    description: s(row['DESCRIPTION']) || title,
  });
  groups.set(key, bucket);
}

const workItems = [];
for (const [, members] of groups) {
  const inFile = members.length;
  const pending = members.filter(
    (m) => !existingSkus.has(m.sku) && !existingVariantSkus.has(m.sku)
  );
  if (pending.length === 0) continue;
  if (pending.length < inFile) {
    skippedPartialGroup++;
    console.warn(
      `  [SKIP GROUP] "${pending[0].title}" — only ${pending.length}/${inFile} SKUs are new; fix DB or CSV and re-run`
    );
    continue;
  }

  pending.sort((a, b) => {
    const ai = a.images.length;
    const bi = b.images.length;
    if (bi !== ai) return bi - ai;
    return a.price - b.price;
  });

  const parent = pending[0];
  const hasVariants = pending.length > 1;
  const slug = generateSlug(parent.title, parent.sku);

  const productPayload = {
    name: parent.title,
    slug,
    description: parent.description,
    price: parent.price,
    category: 'rug',
    sku: parent.sku,
    images: parent.images,
    manufacturer: 'Zinatex',
    color: parent.color,
    dimensions: parent.dimensions,
    in_stock: parent.inStock,
    has_variants: hasVariants,
    variant_type: hasVariants ? 'rug' : null,
    on_sale: false,
    rating: 0,
    review_count: 0,
    tags: [],
  };

  const variantPayloads = hasVariants
    ? pending.map((m) => {
        const sizeFromCsv = m.dimensions?.size ?? null;
        const sizeFromSku = normalizeSize(extractRawSize(m.sku));
        const size = sizeFromCsv || sizeFromSku || null;
        return {
          sku: m.sku,
          size,
          color: m.color,
          price: m.price,
          compare_at_price: null,
          in_stock: m.inStock,
          stock_qty: 0,
          image_url: m.images[0] ?? null,
          sort_order: getVariantSortOrder(size),
        };
      })
    : [];

  workItems.push({ product: productPayload, variants: variantPayloads });
}

let variantRowsToInsert = 0;
for (const w of workItems) variantRowsToInsert += w.variants.length;

console.log('\n=== TRANSFORM SUMMARY ===');
console.log(`  Parent products to insert: ${workItems.length}`);
console.log(`  Variant rows to insert:      ${variantRowsToInsert}`);
console.log(`  Join matched (inv file): ${joinMatched}`);
console.log(`  Join no match → false:   ${joinNoMatch}`);
console.log(`  Filtered (bad price):    ${filteredPrice}`);
console.log(`  Filtered (no name):      ${filteredNoName}`);
console.log(`  Filtered (no SKU):       ${filteredNoSku}`);
console.log(`  Skipped (dupe SKU):      ${dupeSku}`);
console.log(`  Skipped (in DB):         ${skippedExisting}`);
console.log(`  Skipped (partial groups): ${skippedPartialGroup}`);
console.log(`  Placeholder images:      ${placeholders}`);

// ── Step 5: Batch insert products, then product_variants ───────────────────────
let totalInserted = 0, batchErrors = 0, variantInsertErrors = 0;

for (let i = 0; i < workItems.length; i += BATCH_SIZE) {
  const batch = workItems.slice(i, i + BATCH_SIZE);
  const productRows = batch.map((w) => w.product);
  const { data: inserted, error } = await supabase
    .from('products')
    .insert(productRows)
    .select('id, slug');

  if (error) {
    console.error(`  ERROR product batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    batchErrors++;
    continue;
  }

  totalInserted += inserted?.length ?? 0;
  console.log(
    `  Product batch ${Math.floor(i / BATCH_SIZE) + 1} complete — ${inserted?.length ?? 0} inserted`
  );

  if (!inserted || inserted.length !== batch.length) {
    console.error('  ERROR: insert count mismatch — skipping variants for this batch');
    variantInsertErrors++;
    continue;
  }

  for (let j = 0; j < batch.length; j++) {
    const vars = batch[j].variants;
    if (!vars.length) continue;
    const pid = inserted[j].id;
    const withPid = vars.map((v) => ({ ...v, product_id: pid }));
    const { error: vErr } = await supabase.from('product_variants').insert(withPid);
    if (vErr) {
      console.error(`  ERROR variants for ${inserted[j].slug}: ${vErr.message}`);
      variantInsertErrors++;
    }
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
console.log(`Variant insert errors:     ${variantInsertErrors}`);
console.log(`Placeholder images:        ${placeholders}`);
console.log(`Final DB count (Zinatex):  ${totalZTX}`);
console.log(`  In stock:                ${inStockZTX}`);
console.log(`  Out of stock:            ${(totalZTX || 0) - (inStockZTX || 0)}`);
console.log(`Price range:               $${minP} – $${maxP}`);
console.log(`Join match rate:           ${joinMatched}/${mainRows.length} (${Math.round(joinMatched/mainRows.length*100)}%)`);
