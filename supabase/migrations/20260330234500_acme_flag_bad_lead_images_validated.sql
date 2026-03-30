-- Mark ACME parent/kit rows with structurally bad lead images as failed validation
-- so storefront listing rules (images_validated = false) hide them consistently.
-- KIT components are excluded; they use parent imagery on PDP.

UPDATE products
SET images_validated = false
WHERE manufacturer = 'ACME'
  AND COALESCE(TRIM(acme_product_type), '') <> 'component'
  AND (
    images IS NULL
    OR cardinality(images) < 1
    OR images[1] IS NULL
    OR TRIM(images[1]) = ''
    OR lower(images[1]) LIKE '%placeholder%'
    OR lower(images[1]) LIKE '%coming-soon%'
    OR images[1] NOT LIKE 'https://%'
    OR images[1] NOT ILIKE '%acmecorp.com%'
  );
