UPDATE products
SET
  description = CASE
    -- description is null or empty: set it to the old name
    WHEN TRIM(COALESCE(description, '')) = ''
      THEN name

    -- description is identical to name (redundant): keep as-is, the name is already there
    WHEN LOWER(TRIM(description)) = LOWER(TRIM(name))
      THEN name

    -- description already contains the name somewhere: leave description untouched
    WHEN POSITION(LOWER(TRIM(name)) IN LOWER(description)) > 0
      THEN description

    -- description is a real paragraph that doesn't mention the name: prepend "Name — Description"
    ELSE name || ' — ' || description
  END,
  name = sku
WHERE manufacturer = 'Nationwide FD'
  AND sku IS NOT NULL
  AND TRIM(sku) != '';
