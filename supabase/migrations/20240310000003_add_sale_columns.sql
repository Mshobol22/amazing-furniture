-- Run this in Supabase to make yourself admin:
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}' WHERE email = 'YOUR_EMAIL';

-- Add sale columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_sale boolean DEFAULT false;
