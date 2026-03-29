#!/usr/bin/env python3
"""
Compare Zinatex product_variants.price in Supabase to (MSRP/4)*2.3 from the datasheet.

Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
Optional: ZINATEX_CSV_PATH (default: same as zinatex_variant_reimport.py).

  pip install pandas supabase openpyxl
  python scripts/verify_zinatex_prices.py

Exit 0 if no mismatches (within $0.02); exit 1 otherwise or on errors.
"""

from __future__ import annotations

import os
import sys
from decimal import Decimal
from pathlib import Path

import pandas as pd
from supabase import create_client

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = Path(r"C:\Users\mshob\OneDrive\csv for AHF\zinat datasheet.xlsx")
TOLERANCE = Decimal("0.02")
MULT = Decimal("2.3")


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


def expected_price(msrp: object) -> Decimal | None:
    if msrp is None or (isinstance(msrp, float) and pd.isna(msrp)):
        return None
    try:
        m = Decimal(str(msrp).replace("$", "").replace(",", "").strip())
    except Exception:
        return None
    if m <= 0:
        return None
    out = (m / Decimal(4)) * MULT
    return out.quantize(Decimal("0.01"))


def main() -> int:
    load_env_local()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.")
        return 1

    csv_path = Path(os.environ.get("ZINATEX_CSV_PATH", str(DEFAULT_CSV)))
    if not csv_path.is_file():
        print(f"ERROR: Datasheet not found: {csv_path}")
        return 1

    ext = csv_path.suffix.lower()
    if ext in {".xlsx", ".xls"}:
        df = pd.read_excel(csv_path)
    else:
        df = pd.read_csv(csv_path)

    cols = {str(c).strip().lower(): c for c in df.columns}
    c_var = cols.get("variation sku") or cols.get("variation_sku")
    c_msrp = cols.get("msrp") or cols.get("retail price / msrp") or cols.get("retail price")
    if not c_var or not c_msrp:
        print(f"ERROR: Need Variation SKU and MSRP columns. Got: {list(df.columns)}")
        return 1

    expected_by_sku: dict[str, Decimal] = {}
    for _, row in df.iterrows():
        sku = str(row.get(c_var, "") or "").strip()
        if not sku:
            continue
        exp = expected_price(row.get(c_msrp))
        if exp is None:
            continue
        expected_by_sku[sku] = exp

    sb = create_client(url, key)
    pr = (
        sb.table("products")
        .select("id")
        .eq("manufacturer", "Zinatex")
        .eq("has_variants", True)
        .execute()
    )
    parent_ids = [str(x["id"]) for x in (pr.data or [])]
    db_rows: list[dict] = []
    chunk = 80
    for i in range(0, len(parent_ids), chunk):
        part = parent_ids[i : i + chunk]
        vr = (
            sb.table("product_variants")
            .select("sku,price")
            .in_("product_id", part)
            .execute()
        )
        db_rows.extend(vr.data or [])

    mismatches: list[tuple[str, Decimal, Decimal]] = []
    missing_csv: list[str] = []
    for row in db_rows:
        sku = str(row.get("sku") or "").strip()
        if not sku:
            continue
        db_p = Decimal(str(row.get("price", 0)))
        exp = expected_by_sku.get(sku)
        if exp is None:
            missing_csv.append(sku)
            continue
        if abs(db_p - exp) > TOLERANCE:
            mismatches.append((sku, db_p, exp))

    in_csv_not_db = set(expected_by_sku) - {str(r.get("sku", "")).strip() for r in db_rows}

    print("--- Zinatex price verification (expected = round(MSRP/4 * 2.3, 2)) ---")
    print(f"Datasheet rows with SKU + valid MSRP: {len(expected_by_sku)}")
    print(f"DB Zinatex variant rows: {len(db_rows)}")
    print(f"Mismatches (DB vs expected): {len(mismatches)}")
    print(f"DB SKUs not in datasheet (no MSRP row): {len(missing_csv)}")
    print(f"Datasheet SKUs missing from DB: {len(in_csv_not_db)}")

    if mismatches:
        print("\nFirst 30 mismatches (sku, db_price, expected):")
        for sku, db_p, exp in mismatches[:30]:
            print(f"  {sku!r}  db={db_p}  expected={exp}")
        if len(mismatches) > 30:
            print(f"  ... and {len(mismatches) - 30} more")
        return 1

    if missing_csv:
        print("\nWARN: variants in DB without matching priced row in sheet (first 15):")
        for s in missing_csv[:15]:
            print(f"  {s!r}")

    print("\nOK: all DB Zinatex variant prices match (MSRP/4)*2.3 within tolerance.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
