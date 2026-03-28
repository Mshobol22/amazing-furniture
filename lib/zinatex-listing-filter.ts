/**
 * Zinatex listing visibility — exclude per-variant rows superseded by parent + product_variants.
 * Kept separate from lib/supabase/products.ts so client code importing lib/filters does not
 * bundle the admin product helpers.
 */

export function isZinatexSupersededListingRow(row: {
  manufacturer?: string | null;
  has_variants?: boolean | null;
  in_stock?: boolean | null;
}): boolean {
  return (
    row.manufacturer === "Zinatex" &&
    row.has_variants === false &&
    row.in_stock === false
  );
}

export function isZinatexListingVisibleRow(row: {
  manufacturer?: string | null;
  has_variants?: boolean | null;
  in_stock?: boolean | null;
}): boolean {
  return !isZinatexSupersededListingRow(row);
}

/** AND with existing filters: exclude superseded Zinatex variant-only rows from listings. */
export function applyZinatexListingVisibilityFilter(query: any): any {
  return query.or(
    "manufacturer.neq.Zinatex,and(manufacturer.eq.Zinatex,or(has_variants.is.null,has_variants.eq.true,in_stock.eq.true))"
  );
}
