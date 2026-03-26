UPDATE products
SET
  description = CASE
    -- description is null or empty: set to old name
    WHEN TRIM(COALESCE(description, '')) = ''
      THEN name

    -- description is identical to name (very common for United — both say "GRAY VELVET DRESSER")
    WHEN LOWER(TRIM(description)) = LOWER(TRIM(name))
      THEN name

    -- description already contains the old name
    WHEN POSITION(LOWER(TRIM(name)) IN LOWER(description)) > 0
      THEN description

    -- description is a real paragraph without the name: prepend it
    ELSE name || ' — ' || description
  END,
  name = sku
WHERE manufacturer = 'United Furniture'
  AND sku IS NOT NULL
  AND TRIM(sku) != '';
