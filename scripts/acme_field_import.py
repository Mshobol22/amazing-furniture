"""
ACME field import — populates display_name, finish, catalog_size, product_details
from the ACME datasheet XLSX into Supabase products table.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import openpyxl
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────
XLSX_PATH = Path(r"C:\Users\mshob\OneDrive\csv for AHF\acme datasheet.xlsx")
SHEET_NAME = "USE"
BATCH_SIZE = 100

# Column indices (0-based)
COL_SKU          = 10  # Item No.
COL_DISPLAY_NAME = 11  # Description
COL_FINISH       = 17  # Catalog Finish
COL_CATALOG_SIZE = 19  # Catalog Size
COL_PRODUCT_DET  = 32  # Product Details

# ── Load env ──────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def cell_val(row, idx):
    """Return stripped string value or None."""
    try:
        v = row[idx].value
    except IndexError:
        return None
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def read_xlsx():
    """Read XLSX and return dict of sku -> {display_name, finish, catalog_size, product_details}."""
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    ws = wb[SHEET_NAME]
    records = {}
    skipped_empty = 0
    skipped_dup = 0

    for i, row in enumerate(ws.iter_rows()):
        if i == 0:          # skip header row
            continue
        sku = cell_val(row, COL_SKU)
        if not sku:
            skipped_empty += 1
            continue
        if sku in records:  # keep first occurrence
            skipped_dup += 1
            continue
        records[sku] = {
            "display_name":   cell_val(row, COL_DISPLAY_NAME),
            "finish":         cell_val(row, COL_FINISH),
            "catalog_size":   cell_val(row, COL_CATALOG_SIZE),
            "product_details": cell_val(row, COL_PRODUCT_DET),
        }

    wb.close()
    print(f"  XLSX rows read : {len(records):,} unique SKUs")
    print(f"  Skipped (empty SKU)  : {skipped_empty:,}")
    print(f"  Skipped (duplicate)  : {skipped_dup:,}")
    return records


def fetch_acme_products(client):
    """Return dict of sku -> product_id for all ACME products."""
    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("products")
            .select("id, sku")
            .eq("manufacturer", "ACME")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    return {r["sku"]: r["id"] for r in all_rows if r.get("sku")}


def chunked(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=== ACME field import ===\n")

    print("Reading XLSX…")
    xlsx_data = read_xlsx()

    print("\nConnecting to Supabase…")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Fetching ACME products from DB…")
    sku_to_id = fetch_acme_products(client)
    print(f"  ACME products in DB : {len(sku_to_id):,}")

    # Build payloads
    payloads = []
    skipped_no_match = 0
    for sku, fields in xlsx_data.items():
        pid = sku_to_id.get(sku)
        if pid is None:
            skipped_no_match += 1
            continue
        payloads.append({"id": pid, **fields})

    print(f"\n  Matched  : {len(payloads):,}")
    print(f"  No DB match : {skipped_no_match:,}")

    if not payloads:
        print("\nNothing to update. Exiting.")
        return

    # Individual update calls via supabase-py
    import time
    print(f"\nUpdating {len(payloads):,} products (individual updates)…")
    errors = []
    updated = 0
    start = time.time()
    for payload in payloads:
        pid = payload["id"]
        fields = {k: v for k, v in payload.items() if k != "id"}
        try:
            client.table("products").update(fields).eq("id", pid).execute()
            updated += 1
            if updated % 50 == 0 or updated == len(payloads):
                elapsed = time.time() - start
                rate = updated / elapsed if elapsed else 0
                eta = (len(payloads) - updated) / rate if rate else 0
                print(f"  {updated}/{len(payloads)}  ({rate:.0f}/s  ETA {eta:.0f}s)   ", end="\r")
        except Exception as exc:
            errors.append(f"id={pid}: {exc}")

    print()  # newline after \r

    print()  # newline after \r
    print("\n=== Summary ===")
    print(f"  Rows updated : {updated:,}")
    print(f"  Errors       : {len(errors)}")
    if errors:
        for e in errors:
            print(f"    ERROR: {e}")
        sys.exit(1)
    else:
        print("  All updates successful.")


if __name__ == "__main__":
    main()
