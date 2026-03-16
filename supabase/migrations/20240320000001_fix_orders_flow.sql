-- Add missing columns for complete order tracking
-- Applied 2024-03-20 via Supabase MCP

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON orders(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);
