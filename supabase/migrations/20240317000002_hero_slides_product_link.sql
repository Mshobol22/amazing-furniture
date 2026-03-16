-- Add product link columns to hero_slides
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS product_slug TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT;
