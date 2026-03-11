-- Run this in Supabase to make yourself admin (use raw_app_meta_data so it survives Google OAuth re-login):
-- UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' WHERE email = 'YOUR_EMAIL';

-- Add sale columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_sale boolean DEFAULT false;
