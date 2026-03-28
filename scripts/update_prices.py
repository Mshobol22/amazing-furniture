"""
Update product prices from source files for all 4 manufacturers.

Credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
(repo root), same as other scripts — never commit API keys.

Usage: python scripts/update_prices.py
"""

from __future__ import annotations

import subprocess
import sys

# Auto-install missing dependencies
def install(pkg):
    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

for pkg in ["supabase", "openpyxl", "pandas"]:
    try:
        __import__(pkg if pkg != "supabase" else "supabase")
    except ImportError:
        print(f"Installing {pkg}...")
        install(pkg)

import csv
import math
import os
from pathlib import Path

import pandas as pd
from supabase import Client, create_client

REPO_ROOT = Path(__file__).resolve().parents[1]

# Set in main() after loading .env.local
supabase: Client | None = None


def load_env_local() -> None:
    path = REPO_ROOT / ".env.local"
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v

# ── Helpers ───────────────────────────────────────────────────────────────────

def to_float(val):
    """Convert a value to float, stripping $, commas, whitespace. Returns None on failure."""
    if val is None:
        return None
    s = str(val).strip().replace("$", "").replace(",", "")
    try:
        f = float(s)
        return f if math.isfinite(f) else None
    except (ValueError, TypeError):
        return None


def fetch_products(manufacturer: str) -> dict:
    """Return {sku: id} for all products of a manufacturer."""
    result = {}
    page = 0
    page_size = 1000
    while True:
        resp = (
            supabase.table("products")
            .select("id, sku")
            .eq("manufacturer", manufacturer)
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        rows = resp.data or []
        for row in rows:
            if row.get("sku"):
                result[str(row["sku"]).strip()] = row["id"]
        if len(rows) < page_size:
            break
        page += 1
    return result


def batch_update(updates: list[dict], batch_size: int = 100) -> int:
    """
    updates: list of {"id": ..., "price": ...}
    Returns number of successful updates.
    """
    success = 0
    errors = []
    for i in range(0, len(updates), batch_size):
        batch = updates[i : i + batch_size]
        for item in batch:
            try:
                assert supabase is not None
                supabase.table("products").update({"price": item["price"]}).eq("id", item["id"]).execute()
                success += 1
            except Exception as e:
                errors.append(f"  id={item['id']}: {e}")
    if errors:
        print(f"  Errors during update ({len(errors)}):")
        for err in errors[:10]:
            print(err)
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
    return success


def run_manufacturer(name, source_map: dict):
    """
    source_map: {sku_str: calculated_price_float}
    """
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    print(f"  Source rows loaded: {len(source_map)}")

    db_products = fetch_products(name)
    print(f"  DB products found:  {len(db_products)}")

    updates = []
    matched_skus = set()
    unmatched_skus = []

    for sku, price in source_map.items():
        if sku in db_products:
            updates.append({"id": db_products[sku], "price": price})
            matched_skus.add(sku)
        else:
            unmatched_skus.append(sku)

    print(f"  Matched:            {len(matched_skus)}")
    print(f"  Unmatched in DB:    {len(unmatched_skus)}")
    if unmatched_skus[:5]:
        print(f"  Sample unmatched:   {unmatched_skus[:5]}")

    if updates:
        print(f"  Updating {len(updates)} prices...")
        updated = batch_update(updates)
        print(f"  Successfully updated: {updated}")
    else:
        updated = 0
        print("  No updates to perform.")

    return {
        "source_rows": len(source_map),
        "matched": len(matched_skus),
        "unmatched": len(unmatched_skus),
        "updated": updated,
    }


# ── Manufacturer loaders ──────────────────────────────────────────────────────

def load_zinatex():
    path = r"C:\Users\mshob\OneDrive\csv for AHF\zinat datasheet.csv"
    price_map = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = str(row.get("Variation SKU", "") or "").strip()
            raw = row.get("RETAIL PRICE / MSRP", "") or row.get("RETAIL PRICE/ MSRP", "")
            price_raw = to_float(raw)
            if not sku or price_raw is None:
                continue
            calculated = round((price_raw / 4) * 2.2, 2)
            if calculated <= 0:
                continue
            if sku not in price_map:
                price_map[sku] = calculated
    return price_map


def load_nfd():
    path = r"C:\Users\mshob\OneDrive\csv for AHF\NFD datasheet.xlsx"
    df = pd.read_excel(path, engine="openpyxl", dtype=str)
    df.columns = df.columns.str.strip()
    price_map = {}
    for _, row in df.iterrows():
        sku = str(row.get("itemCode", "") or "").strip()
        price_raw = to_float(row.get("itemPrice"))
        if not sku or price_raw is None:
            continue
        calculated = round(price_raw * 2.2, 2)
        if calculated <= 0:
            continue
        if sku not in price_map:
            price_map[sku] = calculated
    return price_map


def load_acme():
    path = r"C:\Users\mshob\OneDrive\csv for AHF\acme datasheet.xlsx"
    df = pd.read_excel(path, engine="openpyxl", dtype=str)
    df.columns = df.columns.str.strip()
    # Find the right column — may be "West Price$" or "West Price $" etc.
    west_col = None
    for col in df.columns:
        if "west" in col.lower() and "price" in col.lower():
            west_col = col
            break
    if west_col is None:
        raise ValueError(f"Could not find West Price column. Columns: {list(df.columns)}")
    print(f"  ACME West Price column: '{west_col}'")

    price_map = {}
    for _, row in df.iterrows():
        sku = str(row.get("Item No.", "") or "").strip()
        price_raw = to_float(row.get(west_col))
        if not sku or price_raw is None:
            continue
        calculated = round(price_raw * 2.6, 2)
        if calculated <= 0:
            continue
        if sku not in price_map:
            price_map[sku] = calculated
    return price_map


def load_united():
    path = r"C:\Users\mshob\OneDrive\csv for AHF\united datasheet.csv"
    price_map = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # "Vendor Sku" is empty in this CSV — use "SKU" instead
            sku = str(row.get("Vendor Sku", "") or "").strip()
            if not sku:
                sku = str(row.get("SKU", "") or "").strip()
            price_raw = to_float(row.get("MSRP"))
            if not sku or price_raw is None:
                continue
            if price_raw <= 0:
                continue
            calculated = round(price_raw, 2)
            if sku not in price_map:
                price_map[sku] = calculated
    return price_map


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    global supabase

    load_env_local()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print(
            "ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "(e.g. in .env.local at the repo root)."
        )
        sys.exit(1)
    supabase = create_client(url, key)

    print("\n" + "="*60)
    print("  PRICE UPDATE — All 4 Manufacturers")
    print("="*60)

    totals = {"source_rows": 0, "matched": 0, "unmatched": 0, "updated": 0}

    manufacturers = [
        ("Zinatex",          load_zinatex),
        ("Nationwide FD",    load_nfd),
        ("ACME",             load_acme),
        ("United Furniture", load_united),
    ]

    for name, loader in manufacturers:
        try:
            print(f"\nLoading {name} source file...")
            price_map = loader()
            stats = run_manufacturer(name, price_map)
            for k in totals:
                totals[k] += stats[k]
        except Exception as e:
            print(f"\n  ERROR processing {name}: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "="*60)
    print("  FINAL SUMMARY")
    print("="*60)
    print(f"  Total source rows:   {totals['source_rows']}")
    print(f"  Total matched:       {totals['matched']}")
    print(f"  Total unmatched:     {totals['unmatched']}")
    print(f"  Total updated in DB: {totals['updated']}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
