# Supabase Migrations

Run these migrations in order via the Supabase SQL Editor (Dashboard → SQL Editor):

1. **20240310000001_fix_product_slugs.sql** — Fixes broken slugs (spaces → hyphens)
2. **20240310000002_fix_product_name_typos.sql** — Fixes supplier CSV typos (Rcliner, Coffe Table, etc.)

Or run via Supabase CLI: `supabase db push`
