-- Run this in Supabase SQL Editor to verify RLS policies on products table
-- If no rows returned, the policy doesn't exist and needs to be created

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products';

-- Expected: One row with policyname = 'Products are viewable by everyone'
-- If missing, run:
-- CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
