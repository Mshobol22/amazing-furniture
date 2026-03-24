-- Facet counts and price bounds for store filters (color_tags, material_type).
-- Called from the browser via Supabase RPC (anon + authenticated).

CREATE OR REPLACE FUNCTION public.get_color_tag_facets(
  p_manufacturer text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_collection text DEFAULT NULL
)
RETURNS TABLE(value text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT t.tag AS value, COUNT(*)::bigint AS count
  FROM public.products p
  CROSS JOIN LATERAL unnest(p.color_tags) AS t(tag)
  WHERE p.in_stock = true
    AND p.images IS NOT NULL
    AND (p_manufacturer IS NULL OR p.manufacturer = p_manufacturer)
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_collection IS NULL OR p.collection = p_collection)
    AND p.color_tags IS NOT NULL
    AND cardinality(p.color_tags) > 0
  GROUP BY t.tag
  ORDER BY count DESC, value ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_material_type_facets(
  p_manufacturer text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS TABLE(value text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT p.material_type AS value, COUNT(*)::bigint AS count
  FROM public.products p
  WHERE p.in_stock = true
    AND p.images IS NOT NULL
    AND p.material_type IS NOT NULL
    AND (p_manufacturer IS NULL OR p.manufacturer = p_manufacturer)
    AND (p_category IS NULL OR p.category = p_category)
  GROUP BY p.material_type
  ORDER BY count DESC, value ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_product_price_bounds(
  p_manufacturer text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS TABLE(min_price numeric, max_price numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT MIN(p.price)::numeric AS min_price, MAX(p.price)::numeric AS max_price
  FROM public.products p
  WHERE p.in_stock = true
    AND p.images IS NOT NULL
    AND (p_manufacturer IS NULL OR p.manufacturer = p_manufacturer)
    AND (p_category IS NULL OR p.category = p_category);
$$;

GRANT EXECUTE ON FUNCTION public.get_color_tag_facets(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_material_type_facets(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_price_bounds(text, text) TO anon, authenticated;
