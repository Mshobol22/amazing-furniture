/**
 * ACME product import script
 * File: acme datasheet.xlsx
 * Pricing: final_price = ROUND((west_price * 2.5) + 300, 2)
 * Only imports rows where Status = 'USE'
 * Wholesale west_price is NEVER stored in the database.
 */

import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://exppyvqjqnnowtjgumfc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const FILE_PATH = path.join('C:', 'Users', 'mshob', 'OneDrive', 'csv for AHF', 'acme datasheet.xlsx');
const BATCH_SIZE = 50;
const PLACEHOLDER = '/images/placeholder-product.jpg';
const URL_REGEX   = /^https?:\/\/.+/;

// ── Column name constants (headers have embedded \r\n) ─────────────────────────
const COL = {
  status:      'Status',
  itemNo:      'Item No.',
  description: 'Description ',          // trailing space in header
  cat:         'CAT (Category Web & Macolab)',
  westPrice:   'West Price$',
  romance:     'Romance',
  collection:  'Collection \r\nName',
  style:       'Style',
  color:       'Upholstery \r\nColor (Basic: Black/White/Red/Yellow/Blue/Pink/Gray/Brown/Orange/Green/PU Leatherrple• Natural/Sand/Camel/Mocha/Espresso/Charcoal/Teal/Olive/Graphite)',
  material:    'Materials (Website)',
  warranty:    'Warranty',
  imageUrl:    'All Product Image URL',
  ctnW:        'Ctn W\r\nInch',
  ctnD:        'Ctn D\r\nInch',
  ctnH:        'Ctn H\r\nInch',
};

// ── Category mapping — all 33 CAT codes found in USE rows ────────────────────
function mapCategory(raw) {
  // Compound codes like "Bedroom Kid • BDB" — use the code after "•"
  const code = raw.includes('•') ? raw.split('•').pop().trim() : raw.trim();
  const map = {
    REC: 'chair',   // recliner
    SEC: 'sofa',    // sectional
    SOF: 'sofa',    // sofa
    FUT: 'sofa',    // futon
    CHA: 'chair',   // chair
    DNC: 'chair',   // dining chair
    BEN: 'chair',   // bench
    OTT: 'chair',   // ottoman
    ROC: 'chair',   // rocker
    BDA: 'bed',     // bedroom adult
    BDB: 'bed',     // bedroom bunk / bunkbed
    BDY: 'bed',     // bedroom youth
    DAY: 'bed',     // daybed
    MAT: 'bed',     // mattress
    DNF: 'table',   // dining full set
    DNH: 'table',   // dining hutch / table
    DNC: 'table',   // dining chairs (also chair — table wins for sets)
    DLG: 'table',   // dining large
    COT: 'table',   // cocktail table
    OCC: 'table',   // occasional table
    KIC: 'table',   // kitchen
    DSK: 'table',   // desk
    MDK: 'table',   // media desk
    BAR: 'table',   // bar table
    TVS: 'tv-stand',
    ENT: 'tv-stand',
    MIR: 'cabinet', // mirror
    ACC: 'cabinet', // accents / accessories
    VAN: 'cabinet', // vanity
    WAR: 'cabinet', // wardrobe
    OFF: 'cabinet', // office
    STG: 'cabinet', // storage
    FIR: 'cabinet', // fireplace / mantel
    WIN: 'cabinet', // wine storage
    CLO: 'cabinet', // closet
    ODR: 'cabinet', // outdoor / other
    WAL: 'cabinet', // wall unit
    STO: 'cabinet', // storage
  };
  return map[code] ?? 'table'; // safe fallback
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function str(v) { return (v || '').toString().trim(); }

function parseImages(raw) {
  const s = str(raw);
  if (!s) return [];
  return s.split(',').map(u => u.trim()).filter(u => u && URL_REGEX.test(u));
}

function generateSlug(name, sku) {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
  const safeSku = sku.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base}-acme-${safeSku}`;
}

// ── Pricing ────────────────────────────────────────────────────────────────────
function calcPrice(westPrice) {
  return Math.round((westPrice * 2.5 + 300) * 100) / 100;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('Reading ACME Excel file…');
const wb   = XLSX.readFile(FILE_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
console.log(`Total rows in file: ${rows.length}`);
console.log(`Sheet: ${wb.SheetNames[0]}`);

// ── Fetch existing SKUs (paginated — DB may have >1000 rows) ───────────────────
console.log('Fetching existing SKUs…');
const existingSkus = new Set();
let page = 0;
const PAGE = 1000;
while (true) {
  const { data: batch } = await supabase
    .from('products').select('sku').not('sku', 'is', null)
    .range(page * PAGE, (page + 1) * PAGE - 1);
  if (!batch || batch.length === 0) break;
  batch.forEach(r => existingSkus.add(r.sku));
  if (batch.length < PAGE) break;
  page++;
}
console.log(`Existing SKUs in DB: ${existingSkus.size}`);

const { count: existingACME } = await supabase
  .from('products').select('id', { count: 'exact', head: true }).eq('manufacturer', 'ACME');
console.log(`Already in DB (ACME): ${existingACME ?? 0}`);

// ── Transform ──────────────────────────────────────────────────────────────────
let filteredStatus = 0, filteredPrice = 0, filteredNoName = 0, filteredNoItem = 0;
let skippedExisting = 0, dupeSku = 0, placeholders = 0;
const seenSkus = new Set();
const products = [];

for (const row of rows) {
  const status = str(row[COL.status]);
  if (status !== 'USE') { filteredStatus++; continue; }

  const itemNo = str(row[COL.itemNo]);
  if (!itemNo) { filteredNoItem++; continue; }

  const name = str(row[COL.description]);
  if (!name) { filteredNoName++; continue; }

  const westPrice = Number(row[COL.westPrice]);
  if (!isFinite(westPrice) || westPrice <= 0 || westPrice >= 50000) { filteredPrice++; continue; }

  // Dedup within file
  if (seenSkus.has(itemNo)) { dupeSku++; continue; }
  seenSkus.add(itemNo);

  // Skip if already in DB
  if (existingSkus.has(itemNo)) { skippedExisting++; continue; }

  // Pricing — west_price NEVER stored
  const price = calcPrice(westPrice);
  if (price <= 300) { filteredPrice++; continue; }

  // Category
  const rawCat = str(row[COL.cat]);
  const category = mapCategory(rawCat);

  // Images
  let images = parseImages(str(row[COL.imageUrl]));
  if (images.length === 0) { images = [PLACEHOLDER]; placeholders++; }

  // Dimensions from carton size
  const ctnW = Number(row[COL.ctnW]) || null;
  const ctnD = Number(row[COL.ctnD]) || null;
  const ctnH = Number(row[COL.ctnH]) || null;
  const dimensions = (ctnW || ctnD || ctnH)
    ? { length: ctnD, width: ctnW, height: ctnH, unit: 'inches' }
    : null;

  products.push({
    name,
    slug: generateSlug(name, itemNo),
    description: str(row[COL.romance]) || name,
    price,
    category,
    sku: itemNo,
    images,
    manufacturer: 'ACME',
    collection: str(row[COL.collection]) || null,
    style: (str(row[COL.style]) || '').slice(0, 100) || null,
    color: (str(row[COL.color]) || '').slice(0, 100) || null,
    material: str(row[COL.material]) || null,
    warranty: str(row[COL.warranty]) || null,
    dimensions,
    in_stock: true,
    on_sale: false,
    rating: 0,
    review_count: 0,
    tags: [],
  });
}

// ── Pricing spot check ─────────────────────────────────────────────────────────
console.log('\n=== PRICING SPOT CHECK (first 5 products) ===');
const useRows = rows.filter(r => str(r[COL.status]) === 'USE' && Number(r[COL.westPrice]) > 0);
useRows.slice(0, 5).forEach(r => {
  const w = Number(r[COL.westPrice]);
  const f = calcPrice(w);
  console.log(` ${str(r[COL.itemNo])} | ${str(r[COL.description]).slice(0,30)} | west=$${w} → final=$${f}`);
});

console.log('\n=== TRANSFORM SUMMARY ===');
console.log(`  Ready to insert:      ${products.length}`);
console.log(`  Filtered (status≠USE):${filteredStatus}`);
console.log(`  Filtered (bad price): ${filteredPrice}`);
console.log(`  Filtered (no name):   ${filteredNoName}`);
console.log(`  Filtered (no itemNo): ${filteredNoItem}`);
console.log(`  Skipped (dupe SKU):   ${dupeSku}`);
console.log(`  Skipped (in DB):      ${skippedExisting}`);
console.log(`  Placeholder images:   ${placeholders}`);

// ── Batch insert ────────────────────────────────────────────────────────────────
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

// ── Final stats ────────────────────────────────────────────────────────────────
const { count: finalCount } = await supabase
  .from('products').select('id', { count: 'exact', head: true }).eq('manufacturer', 'ACME');

const { data: priceData } = await supabase.from('products').select('price').eq('manufacturer', 'ACME');
const prices = (priceData || []).map(r => r.price);
const min = prices.length ? Math.min(...prices).toFixed(2) : 'N/A';
const max = prices.length ? Math.max(...prices).toFixed(2) : 'N/A';
const avg = prices.length ? (prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(2) : 'N/A';

console.log('\n=== IMPORT COMPLETE ===');
console.log(`Rows in file:             ${rows.length}`);
console.log(`Inserted this run:        ${totalInserted}`);
console.log(`Batch errors:             ${batchErrors}`);
console.log(`Placeholder images:       ${placeholders}`);
console.log(`Final DB count (ACME):    ${finalCount}`);
console.log(`Price range:              $${min} – $${max} (avg $${avg})`);
