-- 1. Add collection fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS collection_group TEXT,
  ADD COLUMN IF NOT EXISTS piece_type TEXT,
  ADD COLUMN IF NOT EXISTS is_collection_hero BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bundle_skus TEXT[] DEFAULT '{}';

-- 2. Add image validation field to products table
-- This tracks whether all images in the images[] array
-- have been confirmed reachable. NULL = not yet checked,
-- TRUE = all valid, FALSE = one or more broken.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images_validated BOOLEAN DEFAULT NULL;

-- 3. Create index on collection_group for fast sibling lookups
CREATE INDEX IF NOT EXISTS idx_products_collection_group
  ON products(collection_group);

-- 4. Create index on is_collection_hero for fast hero queries
CREATE INDEX IF NOT EXISTS idx_products_collection_hero
  ON products(is_collection_hero)
  WHERE is_collection_hero = TRUE;

-- 5. Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 6. Enable RLS on wishlists
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for wishlists
-- Users can only read their own wishlist
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert into their own wishlist
CREATE POLICY "Users can add to own wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete from their own wishlist
CREATE POLICY "Users can remove from own wishlist"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Index on wishlists for fast user lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id
  ON wishlists(user_id);

-- 9. Index on wishlists for fast product lookup
--    (e.g. how many users wishlisted this product)
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id
  ON wishlists(product_id);
