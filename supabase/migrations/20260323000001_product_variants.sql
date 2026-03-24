-- Product Variants — Zinatex rug variant model
-- Applied 2026-03-23
-- Supports: parent product row + N size/color variants in product_variants table

CREATE TABLE IF NOT EXISTS product_variants (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              TEXT          UNIQUE NOT NULL,
  size             TEXT,
  color            TEXT,
  price            DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  stock_qty        INTEGER       NOT NULL DEFAULT 0,
  in_stock         BOOLEAN       NOT NULL DEFAULT true,
  image_url        TEXT,
  sort_order       INTEGER       DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants  BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_type  TEXT    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku        ON product_variants(sku);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_product_variants"
  ON product_variants FOR SELECT TO anon, authenticated USING (true);
