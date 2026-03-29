"""
ACME Data Import & Classification Script
==========================================
Step 1 — Tag existing ACME products with acme_product_type + acme_color_group
Step 2 — Import Component rows as new products
Step 3 — Verify and print results
"""

import os
import re
import sys
import time
from pathlib import Path
from collections import defaultdict

import openpyxl
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────
XLSX_PATH = Path(r"C:\Users\mshob\Downloads\ACME ALL Items Product Spec With WEST Price - 03092026.xlsx")
SHEET_NAME = "USE"
BATCH_SIZE = 100

ENV_PATH = Path(__file__).parent.parent / ".env.local"

# Column indices (0-based) from header inspection
COL_PRODUCT_TYPE  = 1
COL_CAT           = 9
COL_ITEM_NO       = 10
COL_DESCRIPTION   = 11   # display_name (short desc)
COL_WEST_PRICE    = 12
COL_FINISH        = 17
COL_COLLECTION    = 18
COL_CATALOG_SIZE  = 19
COL_ROMANCE       = 30   # long description
COL_PRODUCT_DET   = 32

# ── Category mapping (from import-acme.mjs) ───────────────────────────────────
CAT_MAP = {
    'REC': 'chair',   'SEC': 'sofa',    'SOF': 'sofa',    'FUT': 'sofa',
    'CHA': 'chair',   'DNC': 'chair',   'BEN': 'chair',   'OTT': 'chair',
    'ROC': 'chair',   'BDA': 'bed',     'BDB': 'bed',     'BDY': 'bed',
    'DAY': 'bed',     'MAT': 'bed',     'DNF': 'table',   'DNH': 'table',
    'DLG': 'table',   'COT': 'table',   'OCC': 'table',   'KIC': 'table',
    'DSK': 'table',   'MDK': 'table',   'BAR': 'table',   'TVS': 'tv-stand',
    'ENT': 'tv-stand','MIR': 'cabinet', 'ACC': 'cabinet', 'VAN': 'cabinet',
    'WAR': 'cabinet', 'OFF': 'cabinet', 'STG': 'cabinet', 'FIR': 'cabinet',
    'WIN': 'cabinet', 'CLO': 'cabinet', 'ODR': 'cabinet', 'WAL': 'cabinet',
    'STO': 'cabinet', 'GDK': 'table',   'FR6': 'cabinet', 'BOO': 'cabinet',
    'NS':  'cabinet', 'MOD': 'cabinet',
}

def map_category(raw):
    """Map CAT column value to category slug."""
    if not raw:
        return 'table'
    # Handle compound values like "Bedroom Kid • BDB" or "Living • ENT"
    raw = str(raw).strip()
    # Split on bullet or dash separator and take the last token
    for sep in ['•', '–', '-']:
        if sep in raw:
            raw = raw.split(sep)[-1].strip()
            break
    # Also handle slash-separated combos like "SOF/REC" — take first
    if '/' in raw:
        raw = raw.split('/')[0].strip()
    return CAT_MAP.get(raw.upper(), 'table')

# ── Helpers ────────────────────────────────────────────────────────────────────
def cell_val(row, idx):
    """Return stripped string or None."""
    try:
        v = row[idx].value
    except IndexError:
        return None
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

def slugify(text):
    """Lowercase, keep alphanumeric + hyphens, collapse hyphens."""
    if not text:
        return ''
    s = text.lower()
    s = re.sub(r'[^a-z0-9\s-]', '', s).strip()
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s

def generate_slug(display_name, sku):
    base = slugify(display_name)[:60].rstrip('-')
    safe_sku = slugify(sku)
    return f"{base}-acme-{safe_sku}"

def color_group_key(collection, description):
    """Return the acme_color_group key or None if either part is missing."""
    if not collection or not description:
        return None
    return f"{slugify(collection)}_{slugify(description)}"

def calc_price(west_price):
    try:
        w = float(west_price)
        return round(w * 2.5 + 300, 2)
    except (TypeError, ValueError):
        return None

def chunked(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    return env

# ── Read Excel ────────────────────────────────────────────────────────────────
def read_xlsx():
    """
    Parse the Excel and return:
      - singles_kits: list of dicts for Single/KIT/Single-Additional rows
      - components:   list of dicts for Component rows
      - kit_rows:     dict of sku -> {collection} for KIT rows (for parent matching)
    """
    print(f"Reading {XLSX_PATH.name} …")
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    ws = wb[SHEET_NAME]

    singles_kits = []
    components = []
    kit_lookup = {}   # sku -> collection for KIT rows
    skipped_empty = 0

    for i, row in enumerate(ws.iter_rows()):
        if i == 0:
            continue  # header

        sku = cell_val(row, COL_ITEM_NO)
        if not sku:
            skipped_empty += 1
            continue

        product_type = cell_val(row, COL_PRODUCT_TYPE)
        if not product_type:
            skipped_empty += 1
            continue

        description  = cell_val(row, COL_DESCRIPTION)
        collection   = cell_val(row, COL_COLLECTION)
        cat          = cell_val(row, COL_CAT)
        west_price   = cell_val(row, COL_WEST_PRICE)
        finish       = cell_val(row, COL_FINISH)
        catalog_size = cell_val(row, COL_CATALOG_SIZE)
        romance      = cell_val(row, COL_ROMANCE)
        prod_det     = cell_val(row, COL_PRODUCT_DET)

        row_data = {
            'sku':           sku,
            'product_type':  product_type,
            'description':   description,
            'collection':    collection,
            'cat':           cat,
            'west_price':    west_price,
            'finish':        finish,
            'catalog_size':  catalog_size,
            'romance':       romance,
            'product_details': prod_det,
        }

        pt_lower = product_type.strip().lower()
        if pt_lower in ('single', 'kit', 'single-additional'):
            singles_kits.append(row_data)
            if pt_lower == 'kit':
                kit_lookup[sku] = {'collection': collection}
        elif pt_lower == 'components':
            components.append(row_data)

    wb.close()
    print(f"  Singles/KITs/Single-Additional : {len(singles_kits):,}")
    print(f"  Components                      : {len(components):,}")
    print(f"  KIT rows (for parent lookup)    : {len(kit_lookup):,}")
    print(f"  Skipped (empty)                 : {skipped_empty:,}")
    return singles_kits, components, kit_lookup

# ── Supabase helpers ──────────────────────────────────────────────────────────
def fetch_all_acme_products(client):
    """Return list of {id, sku, manufacturer} for all ACME products."""
    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("products")
            .select("id, sku")
            .eq("manufacturer", "ACME")
            .limit(page_size)
            .offset(offset)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows

def fetch_all_skus(client):
    """Return a set of all SKUs in the products table (for idempotent inserts)."""
    all_skus = set()
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("products")
            .select("sku")
            .limit(page_size)
            .offset(offset)
            .execute()
        )
        batch = resp.data or []
        for r in batch:
            if r.get("sku"):
                all_skus.add(r["sku"])
        if len(batch) < page_size:
            break
        offset += page_size
    return all_skus

# ── Step 1: Tag existing ACME products ───────────────────────────────────────
def step1_tag_products(client, singles_kits_rows):
    print("\n=== STEP 1: Tag existing ACME products ===")

    # Map Excel product type -> DB enum value
    PT_MAP = {
        'single':            'single',
        'kit':               'kit',
        'single-additional': 'single_additional',
    }

    # Build lookup: sku -> {acme_product_type, collection, description}
    excel_by_sku = {}
    for row in singles_kits_rows:
        pt_db = PT_MAP.get(row['product_type'].strip().lower())
        if not pt_db:
            continue
        excel_by_sku[row['sku']] = {
            'acme_product_type': pt_db,
            'collection':        row['collection'],
            'description':       row['description'],
        }

    # Compute acme_color_group
    # Group key = slugify(collection)_slugify(description)
    # Count how many singles/kits share each key
    group_counts = defaultdict(list)
    for sku, info in excel_by_sku.items():
        key = color_group_key(info['collection'], info['description'])
        if key:
            group_counts[key].append(sku)

    # Only assign group key if 2+ products share it
    sku_to_color_group = {}
    groups_created = set()
    for key, skus in group_counts.items():
        if len(skus) >= 2:
            for sku in skus:
                sku_to_color_group[sku] = key
            groups_created.add(key)

    print(f"  Excel rows (singles/kits) : {len(excel_by_sku):,}")
    print(f"  Color variant groups      : {len(groups_created):,}")

    # Fetch all ACME products from DB
    print("  Fetching ACME products from DB …")
    acme_rows = fetch_all_acme_products(client)
    print(f"  ACME products in DB       : {len(acme_rows):,}")
    sku_to_id = {r['sku']: r['id'] for r in acme_rows if r.get('sku')}

    # Build update payloads
    payloads = []
    for sku, info in excel_by_sku.items():
        pid = sku_to_id.get(sku)
        if pid is None:
            continue
        payload = {
            'id': pid,
            'acme_product_type': info['acme_product_type'],
        }
        if sku in sku_to_color_group:
            payload['acme_color_group'] = sku_to_color_group[sku]
        else:
            payload['acme_color_group'] = None
        payloads.append(payload)

    print(f"  Products matched for update: {len(payloads):,}")

    if not payloads:
        print("  Nothing to update in Step 1.")
        return 0, len(groups_created)

    # Update in individual calls (supabase-py upsert by id)
    updated = 0
    errors = []
    start = time.time()
    for payload in payloads:
        pid = payload.pop('id')
        try:
            client.table("products").update(payload).eq("id", pid).execute()
            updated += 1
            if updated % 100 == 0 or updated == len(payloads):
                elapsed = time.time() - start
                rate = updated / elapsed if elapsed else 0
                eta = (len(payloads) - updated) / rate if rate else 0
                print(f"  {updated}/{len(payloads)}  ({rate:.0f}/s  ETA {eta:.0f}s)   ", end="\r", flush=True)
        except Exception as exc:
            errors.append(f"id={pid}: {exc}")

    print()  # newline after \r

    if errors:
        print(f"  Errors ({len(errors)}):")
        for e in errors[:10]:
            print(f"    {e}")

    print(f"  Updated: {updated:,}  |  Errors: {len(errors)}")
    return updated, len(groups_created)

# ── Step 2: Import Components ─────────────────────────────────────────────────
def step2_import_components(client, component_rows, kit_lookup, existing_skus):
    print("\n=== STEP 2: Import Components ===")

    # Build an efficient KIT parent lookup
    # For each component, find KIT where:
    #   component_sku.startswith(kit_sku) AND same collection
    # Build a sorted list of kit skus (longer first for most-specific match)
    kit_skus_sorted = sorted(kit_lookup.keys(), key=len, reverse=True)

    def find_parent_kit(comp_sku, comp_collection):
        for kit_sku in kit_skus_sorted:
            if comp_sku.startswith(kit_sku):
                kit_coll = kit_lookup[kit_sku]['collection']
                # Match on collection (case-insensitive, strip)
                if (kit_coll or '').strip().lower() == (comp_collection or '').strip().lower():
                    return kit_sku
        # Fallback: prefix match only (ignore collection) — some may differ slightly
        for kit_sku in kit_skus_sorted:
            if comp_sku.startswith(kit_sku):
                return kit_sku
        return None

    skipped_existing = 0
    skipped_bad_price = 0
    no_parent = []
    to_insert = []
    seen_in_batch = set()

    for row in component_rows:
        sku = row['sku']

        # Idempotent: skip if already in DB
        if sku in existing_skus or sku in seen_in_batch:
            skipped_existing += 1
            continue
        seen_in_batch.add(sku)

        price = calc_price(row['west_price'])
        if price is None or price <= 300:
            skipped_bad_price += 1
            continue

        # Find parent KIT
        parent_sku = find_parent_kit(sku, row['collection'])
        if parent_sku is None:
            no_parent.append(sku)

        # Category
        category = map_category(row['cat'])

        # display_name = Description column
        display_name = row['description'] or sku
        # description = Romance text
        description = row['romance'] or None

        # Slug: {display_name_slugified}-acme-{sku_slugified}
        slug = generate_slug(display_name, sku)

        product = {
            'manufacturer':       'ACME',
            'sku':                 sku,
            'name':                sku,           # per convention: name = item code
            'display_name':        display_name,
            'description':         description or display_name,  # NOT NULL fallback
            'price':               price,
            'compare_at_price':    None,
            'category':            category,
            'collection':          row['collection'],
            'finish':              row['finish'],
            'catalog_size':        row['catalog_size'],
            'product_details':     row['product_details'],
            'in_stock':            True,
            'images':              [],
            'acme_product_type':   'component',
            'acme_kit_parent_sku': parent_sku,
            'slug':                slug,
            'on_sale':             False,
            'rating':              0,
            'review_count':        0,
            'tags':                [],
        }
        to_insert.append(product)

    print(f"  Components in Excel        : {len(component_rows):,}")
    print(f"  Skipped (already in DB)    : {skipped_existing:,}")
    print(f"  Skipped (bad/zero price)   : {skipped_bad_price:,}")
    print(f"  No parent KIT found        : {len(no_parent):,}")
    print(f"  Ready to insert            : {len(to_insert):,}")

    if not to_insert:
        print("  Nothing to insert in Step 2.")
        return 0, no_parent

    # Insert in batches
    inserted = 0
    errors = []
    start = time.time()
    for batch_num, batch in enumerate(chunked(to_insert, BATCH_SIZE), 1):
        try:
            resp = client.table("products").insert(batch).execute()
            inserted += len(batch)
            elapsed = time.time() - start
            rate = inserted / elapsed if elapsed else 0
            total = len(to_insert)
            eta = (total - inserted) / rate if rate else 0
            print(f"  Batch {batch_num}/{(len(to_insert)+BATCH_SIZE-1)//BATCH_SIZE}"
                  f" — {inserted}/{total} inserted  ({rate:.0f}/s  ETA {eta:.0f}s)   ",
                  end="\r", flush=True)
        except Exception as exc:
            errors.append(f"batch {batch_num}: {exc}")
            print(f"\n  ERROR batch {batch_num}: {exc}")

    print()  # newline after \r

    if errors:
        print(f"  Insert errors: {len(errors)}")
    print(f"  Inserted: {inserted:,}  |  Errors: {len(errors)}")
    return inserted, no_parent

# ── Step 3: Verify ────────────────────────────────────────────────────────────
def step3_verify(client, updated_count, inserted_count, groups_count, no_parent):
    print("\n=== STEP 3: Verification ===")

    # Count tagged products: sum across all known types (avoids "not null" filter)
    tagged_count = 0
    for pt in ['single', 'kit', 'single_additional', 'component']:
        r = (client.table("products")
             .select("id", count="exact")
             .eq("manufacturer", "ACME")
             .eq("acme_product_type", pt)
             .execute())
        tagged_count += (r.count or 0)

    # Count components in DB
    resp2 = (client.table("products")
             .select("id", count="exact")
             .eq("manufacturer", "ACME")
             .eq("acme_product_type", "component")
             .execute())
    component_db_count = resp2.count or 0

    # Count products with acme_color_group set (paginated, filter in Python)
    color_group_products = 0
    cg_offset = 0
    while True:
        r3 = (client.table("products")
              .select("acme_color_group")
              .eq("manufacturer", "ACME")
              .limit(1000)
              .offset(cg_offset)
              .execute())
        batch3 = r3.data or []
        color_group_products += sum(1 for x in batch3 if x.get("acme_color_group"))
        if len(batch3) < 1000:
            break
        cg_offset += 1000

    # Sample 5 components with parent SKU (filter non-null in Python)
    resp4 = (client.table("products")
             .select("sku, name, acme_kit_parent_sku, collection")
             .eq("manufacturer", "ACME")
             .eq("acme_product_type", "component")
             .limit(20)
             .execute())
    sample_components = [c for c in (resp4.data or []) if c.get("acme_kit_parent_sku")][:5]

    print(f"\n  ACME products with acme_product_type set : {tagged_count:,}")
    print(f"  Updated this run                          : {updated_count:,}")
    print(f"  Components in DB                          : {component_db_count:,}")
    print(f"  Components inserted this run              : {inserted_count:,}")
    print(f"  Color variant groups created              : {groups_count:,}")
    print(f"  Products with acme_color_group set (DB)  : {color_group_products:,}")

    print(f"\n  Sample components with parent KIT:")
    for c in sample_components:
        print(f"    SKU={c['sku']:20s}  parent={c.get('acme_kit_parent_sku','—')}")

    if no_parent:
        print(f"\n  Components with NO parent KIT ({len(no_parent)} total):")
        for sku in no_parent[:20]:
            print(f"    {sku}")
        if len(no_parent) > 20:
            print(f"    … and {len(no_parent)-20} more")
    else:
        print("  All components matched a parent KIT.")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=== ACME Data Import & Classification ===\n")

    # Load env
    env = load_env(ENV_PATH)
    SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
    SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

    # Parse Excel
    singles_kits, components, kit_lookup = read_xlsx()

    # Connect
    print("\nConnecting to Supabase …")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Connected.")

    # Fetch existing SKUs (for idempotent component insert)
    print("Fetching all existing SKUs from DB …")
    existing_skus = fetch_all_skus(client)
    print(f"  Existing SKUs in DB: {len(existing_skus):,}")

    # Step 1
    updated_count, groups_count = step1_tag_products(client, singles_kits)

    # Step 2
    inserted_count, no_parent = step2_import_components(client, components, kit_lookup, existing_skus)

    # Step 3
    step3_verify(client, updated_count, inserted_count, groups_count, no_parent)

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
