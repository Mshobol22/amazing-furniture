UPDATE products
SET description = (
  CASE
    -- Find first ". " and cut there (most common sentence boundary)
    WHEN POSITION('. ' IN description) > 0
      THEN LEFT(description, POSITION('. ' IN description)) || '.'
    -- Find standalone "." with no following space (end of string period)
    WHEN POSITION('.' IN description) > 0
      THEN LEFT(description, POSITION('.' IN description))
    -- No period found: leave as-is
    ELSE description
  END
)
WHERE manufacturer = 'Zinatex'
  AND description IS NOT NULL
  AND TRIM(description) != '';
