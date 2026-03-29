#!/usr/bin/env python3
"""
Zinatex full variant re-import from the Zinatex datasheet (CSV or XLSX).

Loads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local (repo root).

  pip install pandas supabase
  python scripts/zinatex_variant_reimport.py

Optional: ZINATEX_CSV_PATH=... to override the default Windows path below.
"""

from __future__ import annotations

import os
import re
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

import pandas as pd
from supabase import Client, create_client

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = Path(r"C:\Users\mshob\OneDrive\csv for AHF\zinat datasheet.xlsx")

DESIGN_SUFFIX_RE = re.compile(r"-B\d+-.+$", re.IGNORECASE)
BATCH = 100


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


def design_key_from_parent_sku(parent_sku: str) -> str:
    s = (parent_sku or "").strip()
    if not s:
        return s
    return DESIGN_SUFFIX_RE.sub("", s).strip()


def first_sentence(text: str) -> str:
    t = (text or "").strip()
    if not t:
        return ""
    for delim in [". ", ".\n", "? ", "! "]:
        if delim in t:
            frag = t.split(delim)[0].strip()
            return frag + (delim[0] if delim[0] in ".?!" else ".")
    return t[:800]


def normalize_variation_sku_for_slug(sku: str) -> str:
    s = (sku or "").lower()
    s2 = "".join(ch if ch.isalnum() else "-" for ch in s)
    while "--" in s2:
        s2 = s2.replace("--", "-")
    return s2.strip("-")


def zinatex_style_key_from_variation_sku(sku: str) -> str:
    trimmed = (sku or "").strip()
    if not trimmed:
        return ""
    first = trimmed.split("-")[0]
    if re.fullmatch(r"\d+", first):
        return first.lower()
    return normalize_variation_sku_for_slug(trimmed)


def zinatex_slug_base_from_title(title: str) -> str:
    s = (title or "").lower()
    cleaned = "".join(ch if (ch.isalnum() or ch in " -") else " " for ch in s)
    cleaned = re.sub(r"\s+", "-", cleaned.strip())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned[:60].strip("-")


def canonical_zinatex_slug(title: str, variation_sku: str) -> str:
    base = zinatex_slug_base_from_title(title)
    sk = zinatex_style_key_from_variation_sku(variation_sku)
    safe = re.sub(r"[^a-z0-9]", "-", sk.lower())
    while "--" in safe:
        safe = safe.replace("--", "-")
    safe = safe.strip("-")
    return f"{base}-ztx-{safe}"


def find_col(df: pd.DataFrame, *candidates: str) -> str:
    norm = {re.sub(r"\s+", " ", str(c).strip().lower()): c for c in df.columns}
    for cand in candidates:
        key = re.sub(r"\s+", " ", cand.strip().lower())
        if key in norm:
            return str(norm[key])
    raise SystemExit(f"Missing column {candidates}. Found: {list(df.columns)}")


def money_round(msrp: object) -> Decimal | None:
    if msrp is None or (isinstance(msrp, float) and pd.isna(msrp)):
        return None
    try:
        if isinstance(msrp, str) and not msrp.strip():
            return None
        m = Decimal(str(msrp).replace("$", "").replace(",", "").strip())
    except Exception:
        return None
    if m <= 0:
        return None
    # round((MSRP / 4) * 2.2, 2)
    out = (m / Decimal(4)) * Decimal("2.2")
    return out.quantize(Decimal("0.01"))


def parse_qty(v: object) -> int:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return 0
    try:
        return max(0, int(float(str(v).replace(",", "").strip())))
    except Exception:
        return 0


def main_image_url(v: object) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    if s.lower().startswith("https://"):
        return s
    return None


def main() -> int:
    load_env_local()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.")
        return 1

    csv_path = Path(os.environ.get("ZINATEX_CSV_PATH", str(DEFAULT_CSV)))
    if not csv_path.is_file():
        print(f"ERROR: CSV not found: {csv_path}")
        return 1

    ext = csv_path.suffix.lower()
    if ext in {".xlsx", ".xls"}:
        df = pd.read_excel(csv_path)
    else:
        df = pd.read_csv(csv_path)
    c_parent = find_col(df, "parent sku", "parent_sku")
    c_var = find_col(df, "variation sku", "variation_sku")
    c_size = find_col(df, "size")
    c_color = find_col(df, "color")
    c_msrp = find_col(df, "msrp", "retail price / msrp", "retail price", "price")
    c_qty = find_col(df, "quantity on hand", "quantity_on_hand")
    c_cat = find_col(df, "category")
    c_desc = find_col(df, "description")
    c_img = find_col(df, "main image", "main_image")

    groups: dict[str, list[int]] = defaultdict(list)
    for idx, row in df.iterrows():
        pk = design_key_from_parent_sku(str(row.get(c_parent, "") or ""))
        if pk:
            groups[pk].append(int(idx))

    sb: Client = create_client(url, key)

    parents_created = 0
    parents_updated = 0
    variants_ok = 0
    variants_deduped = 0
    hidden = 0
    errors: list[str] = []
    variant_skus: set[str] = set()

    for dk, row_indices in groups.items():
        first = df.loc[row_indices[0]]
        cat_val = first.get(c_cat)
        collection = (
            str(cat_val).strip()
            if cat_val is not None and not (isinstance(cat_val, float) and pd.isna(cat_val))
            else "rug"
        )
        desc = first_sentence(str(first.get(c_desc, "") or ""))
        img = main_image_url(first.get(c_img))
        images = [img] if img else []

        first_var_sku = ""
        for ri in row_indices:
            sku = str(df.loc[ri].get(c_var, "") or "").strip()
            if sku:
                first_var_sku = sku
                break
        if not first_var_sku:
            errors.append(f"No Variation SKU for design_key={dk!r}")
            continue

        slug = canonical_zinatex_slug(dk, first_var_sku)

        r = (
            sb.table("products")
            .select("id,slug")
            .eq("manufacturer", "Zinatex")
            .ilike("name", dk)
            .limit(5)
            .execute()
        )
        rows = r.data or []
        parent_id: str | None = None
        if rows:
            parent_id = str(rows[0]["id"])
            sb.table("products").update(
                {"has_variants": True, "in_stock": True}
            ).eq("id", parent_id).execute()
            parents_updated += 1
        else:
            ins = {
                "name": dk,
                "slug": slug,
                "manufacturer": "Zinatex",
                "has_variants": True,
                "in_stock": True,
                "category": "rug",
                "collection": collection or None,
                "description": desc or "Zinatex rug",
                "images": images if images else [],
                "tags": [],
                "price": 0,
                "rating": 0,
                "review_count": 0,
            }
            try:
                insr = sb.table("products").insert(ins).execute()
                if insr.data and len(insr.data) > 0:
                    parent_id = str(insr.data[0]["id"])
                    parents_created += 1
                else:
                    errors.append(f"Insert parent failed for {dk!r}")
                    continue
            except Exception as e:  # noqa: BLE001
                errors.append(f"Insert parent {dk!r}: {e}")
                continue

        assert parent_id
        vrows: list[dict] = []
        for ri in row_indices:
            row = df.loc[ri]
            var_sku = str(row.get(c_var, "") or "").strip()
            if not var_sku:
                continue
            price = money_round(row.get(c_msrp))
            if price is None:
                continue
            qty = parse_qty(row.get(c_qty))
            variant_skus.add(var_sku)
            var_img = main_image_url(row.get(c_img))
            raw_m = row.get(c_msrp)
            cmp_at: float | None = None
            if raw_m is not None and not (isinstance(raw_m, float) and pd.isna(raw_m)):
                try:
                    cmp_at = float(
                        Decimal(str(raw_m).replace("$", "").replace(",", "").strip())
                    )
                except Exception:
                    cmp_at = None
            vrows.append(
                {
                    "product_id": parent_id,
                    "sku": var_sku,
                    "size": str(row.get(c_size, "") or "").strip() or None,
                    "color": str(row.get(c_color, "") or "").strip() or None,
                    "price": float(price),
                    "compare_at_price": cmp_at,
                    "in_stock": qty > 0,
                    "stock_qty": qty,
                    "sort_order": 0,
                    "image_url": var_img,
                }
            )

        # Avoid ON CONFLICT self-collision when source file has duplicate Variation SKU rows.
        dedup_by_sku: dict[str, dict] = {}
        for variant_row in vrows:
            sku_key = str(variant_row.get("sku") or "").strip()
            if not sku_key:
                continue
            dedup_by_sku[sku_key] = variant_row
        variants_deduped += max(0, len(vrows) - len(dedup_by_sku))
        vrows = list(dedup_by_sku.values())

        for i in range(0, len(vrows), BATCH):
            chunk = vrows[i : i + BATCH]
            try:
                sb.table("product_variants").upsert(chunk, on_conflict="sku").execute()
                variants_ok += len(chunk)
            except Exception as e:  # noqa: BLE001
                errors.append(f"variants {dk!r} batch: {e}")

    # Step 4 — hide superseded product rows
    r_all = (
        sb.table("products")
        .select("id,sku,has_variants,in_stock")
        .eq("manufacturer", "Zinatex")
        .execute()
    )
    to_hide: list[str] = []
    for row in r_all.data or []:
        hv = row.get("has_variants")
        if hv is True:
            continue
        sku = (row.get("sku") or "").strip()
        if sku and sku in variant_skus:
            if row.get("in_stock") is not False:
                to_hide.append(str(row["id"]))

    for i in range(0, len(to_hide), BATCH):
        chunk = to_hide[i : i + BATCH]
        for pid in chunk:
            try:
                sb.table("products").update({"in_stock": False}).eq("id", pid).execute()
                hidden += 1
            except Exception as e:  # noqa: BLE001
                errors.append(f"hide {pid}: {e}")

    print("--- Zinatex variant re-import summary ---")
    print(f"Design keys processed: {len(groups)}")
    print(f"Parent products created: {parents_created}")
    print(f"Parent products updated: {parents_updated}")
    print(f"Variant rows upserted (rows): {variants_ok}")
    print(f"Duplicate variant rows skipped: {variants_deduped}")
    print(f"Individual product rows set in_stock=false: {hidden}")
    print(f"Distinct variant SKUs: {len(variant_skus)}")
    if errors:
        print(f"Errors / warnings ({len(errors)}):")
        for e in errors[:50]:
            print(f"  - {e}")
        if len(errors) > 50:
            print(f"  ... and {len(errors) - 50} more")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
