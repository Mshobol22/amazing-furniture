-- United Furniture: Page ID and feature bullets from united datasheet (product pages)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS page_id TEXT,
  ADD COLUMN IF NOT EXISTS page_features TEXT[];

COMMENT ON COLUMN public.products.page_id IS 'United Furniture datasheet Page ID (e.g. B020)';
COMMENT ON COLUMN public.products.page_features IS 'Feature bullets from United Furniture datasheet Page Features column';
