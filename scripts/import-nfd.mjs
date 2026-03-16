/**
 * Nationwide FD product import script
 * Reads NFD datasheet.xlsx and upserts into Supabase products table.
 * Safe to re-run — uses ON CONFLICT (sku) DO NOTHING.
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://exppyvqjqnnowtjgumfc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required');
  process.exit(1);
}

const FILE_PATH = path.join('C:', 'Users', 'mshob', 'OneDrive', 'csv for AHF', 'NFD datasheet.xlsx');
const BATCH_SIZE = 50;
const PLACEHOLDER_IMAGE = '/images/placeholder-product.jpg';
const URL_REGEX = /^https?:\/\/.+/;

// ── Category mapping (NFD → our schema) ───────────────────────────────────────
function mapCategory(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('packaging')) return null; // skip
  if (s.includes('tv stand')) return 'tv-stand';
  if (s.includes('recliner')) return 'chair';
  if (s.includes('accent chair')) return 'chair';
  if (s.includes('chaise')) return 'chair';
  if (s.includes('chest')) return 'cabinet';
  if (s.includes('occasional')) return 'table';
  if (s.includes('dining') || s.includes('dinette') || s.includes('pub set')) return 'table';
  if (s.includes('sectional')) return 'sofa';
  if (s.includes('sofa') || s.includes('loveseat') || s.includes('sleeper') || s.includes('motion')) return 'sofa';
  if (s.includes('bedroom') || s.includes('bed') || s.includes('bunk') || s.includes('daybed')) return 'bed';
  return 'table'; // fallback
}

// ── Slug generator ─────────────────────────────────────────────────────────────
function generateSlug(name, sku) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  const safeSku = sku.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}-nfd-${safeSku}`;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('Reading Excel file…');
const wb = XLSX.readFile(FILE_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log(`Total rows in file: ${rawRows.length}`);

// Check existing Nationwide FD products
const { count: existingCount } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('manufacturer', 'Nationwide FD');
console.log(`Already in Supabase (manufacturer = 'Nationwide FD'): ${existingCount ?? 0}`);

// ── Transform rows ─────────────────────────────────────────────────────────────
const seenSkus = new Set();
let skipped = 0, placeholderCount = 0;
const products = [];

for (const row of rawRows) {
  const sku = (row.itemCode || '').toString().trim();
  const name = (row.itemName || '').toString().trim();
  const rawCategory = (row.itemGroupCategory || '').toString().trim();

  // Skip packaging rows
  const category = mapCategory(rawCategory);
  if (category === null) {
    console.log(`  SKIP (packaging): ${sku} | ${name}`);
    skipped++;
    continue;
  }

  // Deduplicate SKUs — first occurrence wins
  if (seenSkus.has(sku)) {
    console.log(`  SKIP (duplicate SKU): ${sku} | ${name}`);
    skipped++;
    continue;
  }
  seenSkus.add(sku);

  // Price validation — must be a positive number
  const price = Number(row.itemPrice);
  if (!isFinite(price) || price <= 0) {
    console.log(`  SKIP (invalid price): ${sku} | ${name} | price=${row.itemPrice}`);
    skipped++;
    continue;
  }

  // Image URL validation
  const rawImage = (row.itemGroupImage || '').toString().trim();
  let imageUrl;
  if (rawImage && URL_REGEX.test(rawImage)) {
    imageUrl = rawImage;
  } else {
    imageUrl = PLACEHOLDER_IMAGE;
    placeholderCount++;
    console.log(`  PLACEHOLDER image: ${sku} | ${name}`);
  }

  // Thumbnail as second image if valid
  const rawThumb = (row.itemGroupThumb || '').toString().trim();
  const images = [imageUrl];
  if (rawThumb && URL_REGEX.test(rawThumb) && rawThumb !== imageUrl) {
    images.push(rawThumb);
  }

  products.push({
    name,
    slug: generateSlug(name, sku),
    description: [
      row.itemGroupFeatures || '',
      row.itemGroupMeasurements || '',
    ].filter(Boolean).join('\n\n').trim() || name,
    price,
    category,
    sku,
    images,
    manufacturer: 'Nationwide FD',
    in_stock: true,
    on_sale: false,
    rating: 0,
    review_count: 0,
    tags: [],
  });
}

console.log(`\nReady to insert: ${products.length} products`);
console.log(`Skipped: ${skipped} (packaging + duplicate SKUs)`);
console.log(`Placeholder images used: ${placeholderCount}`);

// ── Fetch existing SKUs to avoid double-insert ──────────────────────────────────
console.log('\nFetching existing SKUs from DB…');
const { data: existingRows } = await supabase
  .from('products')
  .select('sku')
  .not('sku', 'is', null);
const existingSkus = new Set((existingRows || []).map(r => r.sku));
console.log(`Existing SKUs in DB: ${existingSkus.size}`);

const newProducts = products.filter(p => !existingSkus.has(p.sku));
console.log(`Net new products to insert: ${newProducts.length}`);

// ── Batch insert ────────────────────────────────────────────────────────────────
const batches = [];
for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
  batches.push(newProducts.slice(i, i + BATCH_SIZE));
}

let inserted = 0, errors = 0;
for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  const { error } = await supabase
    .from('products')
    .insert(batch);

  if (error) {
    console.error(`  ERROR batch ${i + 1}/${batches.length}:`, error.message);
    errors++;
  } else {
    inserted += batch.length;
    console.log(`  Inserted batch ${i + 1}/${batches.length} (${batch.length} products)`);
  }
}


// ── Final count ─────────────────────────────────────────────────────────────────
const { count: finalCount } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('manufacturer', 'Nationwide FD');

console.log('\n=== IMPORT COMPLETE ===');
console.log(`Products in file:         ${rawRows.length}`);
console.log(`Skipped (pre-insert):     ${skipped}`);
console.log(`Attempted inserts:        ${products.length}`);
console.log(`Batch errors:             ${errors}`);
console.log(`Placeholder images used:  ${placeholderCount}`);
console.log(`Final DB count (NFD):     ${finalCount}`);
