-- Add richer product columns
-- images and compare_price already exist; all new columns nullable with no defaults
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS collection     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS style          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS warranty       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS color          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS material       TEXT,
  ADD COLUMN IF NOT EXISTS dimensions     JSONB,
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2);

-- Manufacturers reference table
CREATE TABLE IF NOT EXISTS manufacturers (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN      DEFAULT true,
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- Seed manufacturers
INSERT INTO manufacturers (name, slug, description, sort_order) VALUES
  ('Nationwide FD',   'nationwide-fd',    'Wide selection of quality home furniture',   1),
  ('United Furniture','united-furniture', 'Premium furniture import and export',         2),
  ('ACME',            'acme',             'Modern furniture with quality craftsmanship', 3),
  ('Zinatex',         'zinatex',          'Luxury area rugs and premium floor coverings',4),
  ('Artisan',         'artisan',          'Coming soon',                                 5),
  ('Interpraise',     'interpraise',      'Coming soon',                                 6)
ON CONFLICT (slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_manufacturer
  ON products(manufacturer);

CREATE INDEX IF NOT EXISTS idx_products_category_manufacturer
  ON products(category, manufacturer);

-- RLS on manufacturers: public read, no anon write
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manufacturers_public_read" ON manufacturers
  FOR SELECT USING (true);
