-- Hero slides for the homepage slideshow
CREATE TABLE IF NOT EXISTS hero_slides (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  headline    TEXT        NOT NULL,
  subheading  TEXT,
  cta_label   TEXT        NOT NULL DEFAULT 'Shop Now',
  cta_href    TEXT        NOT NULL DEFAULT '/collections/all',
  image_url   TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: public read only
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hero_slides_public_read" ON hero_slides
  FOR SELECT USING (true);

-- Seed 3 initial slides
INSERT INTO hero_slides (headline, subheading, cta_label, cta_href, image_url, sort_order) VALUES
  (
    'Elevate Your Living Space',
    'Handcrafted sofas, beds, and tables for the modern home',
    'Shop All',
    '/collections/all',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1800&q=80',
    1
  ),
  (
    'Bedroom Collections',
    'Premium bed frames and bedroom sets for restful nights',
    'Shop Beds',
    '/collections/bed',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1800&q=80',
    2
  ),
  (
    'Artisan Rugs by Zinatex',
    'Handwoven area rugs that anchor every room with warmth',
    'Shop Rugs',
    '/collections/rug',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1800&q=80',
    3
  )
ON CONFLICT DO NOTHING;
