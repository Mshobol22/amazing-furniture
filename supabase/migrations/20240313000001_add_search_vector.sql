-- Add search_vector for full-text search
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Build search vector from name, description, category, tags
UPDATE products
SET search_vector = (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
)
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_update ON products;
CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE OF name, description, category, tags
  ON products
  FOR EACH ROW
  EXECUTE PROCEDURE products_search_vector_trigger();

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS products_search_vector_idx ON products USING GIN (search_vector);

-- RPC function for full-text + fuzzy search (three passes, merged)
CREATE OR REPLACE FUNCTION search_products(query_text text)
RETURNS SETOF products
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH
  pattern AS (SELECT '%' || trim(query_text) || '%' AS p),
  -- Pass 1: Full-text search (best quality)
  ft AS (
    SELECT p.*, 1 AS rank
    FROM products p, plainto_tsquery('english', trim(query_text)) q
    WHERE p.search_vector @@ q
    ORDER BY ts_rank(p.search_vector, q) DESC
    LIMIT 12
  ),
  -- Pass 2: Fuzzy ilike on name (exclude pass 1 ids)
  name_match AS (
    SELECT p.*, 2 AS rank
    FROM products p, pattern
    WHERE p.name ILIKE pattern.p
      AND p.id NOT IN (SELECT id FROM ft)
    ORDER BY p.created_at DESC
    LIMIT 12
  ),
  -- Pass 3: Fuzzy ilike on description (exclude pass 1 and 2 ids)
  desc_match AS (
    SELECT p.*, 3 AS rank
    FROM products p, pattern
    WHERE p.description ILIKE pattern.p
      AND p.id NOT IN (SELECT id FROM ft)
      AND p.id NOT IN (SELECT id FROM name_match)
    ORDER BY p.created_at DESC
    LIMIT 12
  ),
  merged AS (
    SELECT * FROM ft
    UNION ALL
    SELECT * FROM name_match
    UNION ALL
    SELECT * FROM desc_match
  )
  SELECT id, name, slug, description, price, compare_price, images, category,
         in_stock, rating, review_count, tags, created_at, on_sale, sale_price,
         sku, search_vector
  FROM (
    SELECT DISTINCT ON (id) *
    FROM merged
    ORDER BY id, rank
  ) dedup
  ORDER BY rank, name
  LIMIT 12;
$$;
