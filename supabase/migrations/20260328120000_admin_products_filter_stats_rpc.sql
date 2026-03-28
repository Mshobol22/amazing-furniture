-- Lightweight aggregate stats for admin products filter sidebar (GROUP BY, no full table scan of all columns).

CREATE OR REPLACE FUNCTION public.admin_products_manufacturer_counts()
RETURNS TABLE(value text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(trim(both from manufacturer), ''), 'Unknown') AS value,
    COUNT(*)::bigint AS count
  FROM public.products
  GROUP BY 1
  ORDER BY count DESC, value ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_products_category_counts()
RETURNS TABLE(value text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN category IS NULL OR trim(both from category) = '' THEN 'Uncategorized'
      ELSE trim(both from category)
    END AS value,
    COUNT(*)::bigint AS count
  FROM public.products
  GROUP BY 1
  ORDER BY count DESC, value ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_products_categories_by_manufacturer()
RETURNS TABLE(manufacturer text, category text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(trim(both from p.manufacturer), ''), 'Unknown') AS manufacturer,
    CASE
      WHEN p.category IS NULL OR trim(both from p.category) = '' THEN 'Uncategorized'
      ELSE trim(both from p.category)
    END AS category,
    COUNT(*)::bigint AS count
  FROM public.products p
  GROUP BY 1, 2
  ORDER BY manufacturer ASC, count DESC, category ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_products_stock_counts()
RETURNS TABLE(in_stock bigint, out_of_stock bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE in_stock IS TRUE)::bigint AS in_stock,
    COUNT(*) FILTER (WHERE in_stock IS FALSE)::bigint AS out_of_stock
  FROM public.products;
$$;

REVOKE ALL ON FUNCTION public.admin_products_manufacturer_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_products_category_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_products_categories_by_manufacturer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_products_stock_counts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_products_manufacturer_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_products_category_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_products_categories_by_manufacturer() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_products_stock_counts() TO service_role;
