-- Atomically decrement stock_qty for a product_variant.
-- Floors at 0. Only flips in_stock → false when stock_qty was tracked (> 0)
-- and reaches 0 after decrement. Variants with stock_qty = 0 (unknown qty)
-- keep their existing in_stock value untouched.

CREATE OR REPLACE FUNCTION decrement_variant_stock(variant_id UUID, qty INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE product_variants
  SET
    stock_qty = GREATEST(0, stock_qty - qty),
    in_stock = CASE
      WHEN GREATEST(0, stock_qty - qty) = 0 AND stock_qty > 0 THEN false
      ELSE in_stock
    END
  WHERE id = variant_id;
END;
$$;
