-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;

-- Populate sku from slug: last hyphen-separated segment, uppercased
-- e.g. "2-pc-sectional-u393" -> "U393", "dresser-b101" -> "B101"
UPDATE products
SET sku = UPPER(
  (string_to_array(slug, '-'))[array_length(string_to_array(slug, '-'), 1)]
)
WHERE slug IS NOT NULL AND slug != '';

-- Constraint: if on_sale is true, sale_price must not be null
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_on_sale_requires_sale_price;
ALTER TABLE products ADD CONSTRAINT products_on_sale_requires_sale_price
  CHECK (NOT on_sale OR sale_price IS NOT NULL);
