-- Fix broken slugs: replace spaces with hyphens
-- About 30+ bed products had spaces in slugs (e.g. "black-king-bed-b535 bed")
UPDATE products
SET slug = REPLACE(slug, ' ', '-')
WHERE slug LIKE '% %';
