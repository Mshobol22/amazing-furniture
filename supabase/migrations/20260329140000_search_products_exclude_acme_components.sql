-- Exclude ACME KIT components from search_products (parity with storefront listing filters).

CREATE OR REPLACE FUNCTION search_products(query_text text)
RETURNS SETOF products
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH
  pattern AS (SELECT '%' || trim(query_text) || '%' AS p),
  ft AS (
    SELECT p.id, 1 AS rank
    FROM products p, plainto_tsquery('english', trim(query_text)) q
    WHERE p.search_vector @@ q
      AND NOT (p.manufacturer = 'ACME' AND p.acme_product_type = 'component')
    ORDER BY ts_rank(p.search_vector, q) DESC
    LIMIT 12
  ),
  name_match AS (
    SELECT p.id, 2 AS rank
    FROM products p, pattern
    WHERE p.name ILIKE pattern.p
      AND NOT (p.manufacturer = 'ACME' AND p.acme_product_type = 'component')
      AND p.id NOT IN (SELECT id FROM ft)
    ORDER BY p.created_at DESC
    LIMIT 12
  ),
  desc_match AS (
    SELECT p.id, 3 AS rank
    FROM products p, pattern
    WHERE p.description ILIKE pattern.p
      AND NOT (p.manufacturer = 'ACME' AND p.acme_product_type = 'component')
      AND p.id NOT IN (SELECT id FROM ft)
      AND p.id NOT IN (SELECT id FROM name_match)
    ORDER BY p.created_at DESC
    LIMIT 12
  ),
  merged_ids AS (
    SELECT * FROM ft
    UNION ALL
    SELECT * FROM name_match
    UNION ALL
    SELECT * FROM desc_match
  ),
  dedup AS (
    SELECT DISTINCT ON (id) id, rank
    FROM merged_ids
    ORDER BY id, rank
  )
  SELECT p.*
  FROM dedup d
  JOIN products p ON p.id = d.id
  ORDER BY d.rank, p.name
  LIMIT 12;
$$;
