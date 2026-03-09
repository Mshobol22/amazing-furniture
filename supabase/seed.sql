-- ============================================
-- PHASE 3: Seed Data - 12 Furniture Products
-- Run this AFTER schema.sql in your Supabase SQL Editor
-- ============================================

INSERT INTO products (name, slug, description, price, compare_price, images, category, in_stock, rating, review_count, tags) VALUES
-- BED (2)
(
  'Platform Bed Frame',
  'platform-bed-frame',
  'Low-profile platform bed crafted from solid oak. Clean lines and minimalist design complement any bedroom. No box spring required.',
  799.00,
  949.00,
  ARRAY['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800'],
  'bed',
  true,
  4.8,
  124,
  ARRAY['bedroom', 'oak', 'platform', 'modern']
),
(
  'Upholstered King Bed',
  'upholstered-king-bed',
  'Luxurious tufted headboard in soft velvet. Sturdy hardwood frame with center support. Available in charcoal, navy, and cream.',
  1299.00,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800'],
  'bed',
  true,
  4.6,
  89,
  ARRAY['bedroom', 'velvet', 'king', 'luxury']
),
-- CHAIR (2)
(
  'Velvet Lounge Chair',
  'velvet-lounge-chair',
  'Mid-century inspired lounge chair with tapered wood legs. Deep seat and curved back for ultimate comfort. Handcrafted in Italy.',
  899.00,
  1099.00,
  ARRAY['https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800'],
  'chair',
  true,
  4.9,
  156,
  ARRAY['living room', 'velvet', 'mid-century', 'accent']
),
(
  'Leather Executive Chair',
  'leather-executive-chair',
  'Premium top-grain leather office chair with lumbar support. Adjustable height and tilt. Built for all-day comfort.',
  649.00,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800'],
  'chair',
  true,
  4.7,
  203,
  ARRAY['office', 'leather', 'ergonomic']
),
-- SOFA (2)
(
  'Scandinavian Sectional',
  'scandinavian-sectional',
  'Modular sectional with clean Nordic design. Dense foam cushions and durable linen blend fabric. Configurable to fit your space.',
  1899.00,
  2199.00,
  ARRAY['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
  'sofa',
  true,
  4.8,
  178,
  ARRAY['living room', 'sectional', 'linen', 'scandinavian']
),
(
  'Classic Chesterfield Sofa',
  'classic-chesterfield-sofa',
  'Timeless Chesterfield with deep button tufting and rolled arms. Kiln-dried hardwood frame. Available in multiple leather colors.',
  2499.00,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
  'sofa',
  true,
  4.9,
  92,
  ARRAY['living room', 'chesterfield', 'leather', 'traditional']
),
-- TABLE (2)
(
  'Modern Oak Dining Table',
  'modern-oak-dining-table',
  'Solid European oak dining table with natural grain. Seats 6-8. Water-resistant finish. Hand-assembled in our workshop.',
  1299.00,
  1499.00,
  ARRAY['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800'],
  'table',
  true,
  4.7,
  145,
  ARRAY['dining', 'oak', 'modern', 'solid wood']
),
(
  'Marble Top Coffee Table',
  'marble-top-coffee-table',
  'Elegant coffee table with genuine Carrara marble top and brass legs. Perfect centerpiece for your living room.',
  899.00,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800'],
  'table',
  true,
  4.5,
  67,
  ARRAY['living room', 'marble', 'brass', 'luxury']
),
-- CABINET (2)
(
  'Mid-Century Credenza',
  'mid-century-credenza',
  'Walnut credenza with tapered legs and brass hardware. Four drawers and two cabinet doors. Perfect for dining or living room.',
  1199.00,
  1399.00,
  ARRAY['https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800'],
  'cabinet',
  true,
  4.6,
  98,
  ARRAY['storage', 'walnut', 'mid-century', 'credenza']
),
(
  'Modern Storage Cabinet',
  'modern-storage-cabinet',
  'Sleek storage cabinet with soft-close doors. Adjustable shelves. Available in white, black, and natural oak veneer.',
  749.00,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1591535767884-3e64d6aeab49?w=800'],
  'cabinet',
  true,
  4.4,
  112,
  ARRAY['storage', 'modern', 'multipurpose']
),
-- TV-STANDS (2)
(
  'Floating TV Console',
  'floating-tv-console',
  'Wall-mounted TV console with integrated cable management. Solid wood construction. Supports TVs up to 65 inches.',
  599.00,
  699.00,
  ARRAY['https://images.unsplash.com/photo-1542487354-feaf93476caa?w=800'],
  'tv-stands',
  true,
  4.7,
  134,
  ARRAY['entertainment', 'wall-mount', 'modern']
),
(
  'Industrial TV Stand',
  'industrial-tv-stand',
  'Industrial-style TV stand with metal frame and reclaimed wood shelves. Open design for media components and decor.',
  549.00,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1657524520861-0b2690efc2b2?w=800'],
  'tv-stands',
  true,
  4.5,
  87,
  ARRAY['entertainment', 'industrial', 'reclaimed wood']
);
