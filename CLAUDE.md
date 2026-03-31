# Amazing Home Furniture Store — CLAUDE.md
> Last updated: March 31, 2026 | Read this fully before touching any code.

## Project
- **Site:** https://www.amazinghomefurniturestore.com
- **Repo:** github.com/Mshobol22/amazing-furniture (branch: main)
- **Local:** C:\Users\mshob\OneDrive\Desktop\amazing furniture\
- **Deploy:** Vercel (auto-deploy on push to main)

## Stack
- Next.js 15.5.14 App Router, TypeScript, Tailwind CSS
- Supabase (auth + DB) — Auth is Supabase Auth with Google OAuth. NOT Clerk.
- Stripe (payments + webhooks) — currently in TEST mode, awaiting client live account
- Resend (transactional email), shadcn/ui
- csv-parse (inventory sync cron jobs)
- Deployed on Vercel

## Key IDs
- Supabase project: `exppyvqjqnnowtjgumfc`
- Vercel project: `prj_8tvkzfngOaapp5tmzasa4gqK9eC9`
- Vercel team: `team_pZsX8SevXweyB2MNyjBjYiD0`

## Brand Colors
- Cream: `#FAF8F5` | Charcoal: `#1C1C1C`
- Forest Green: `#2D4A3E` (primary accent)
- Forest Light: `#3B5E4F` | Forest Dark: `#1E3329`

## Database — Key Tables
- `products` — name, slug, price, sale_price, on_sale, images (TEXT[]),
  manufacturer, category, sku, in_stock, description, color, material,
  collection, dimensions (JSONB), compare_at_price, warranty,
  display_name, finish, catalog_size, product_details,
  acme_product_type, acme_kit_parent_sku, acme_color_group,
  page_id, page_features, collection_group, bundle_skus,
  images_validated
- `orders` — id, user_id, items (JSONB), subtotal, shipping, total,
  tax_amount, tax_rate, status, stripe_payment_intent_id,
  customer_name, customer_email, shipping_address (JSONB),
  discount_code, discount_amount
- `profiles` — id (auth.uid), full_name, phone, saved_address (JSONB),
  updated_at (auto-trigger)
- `manufacturers` — id, name, slug, description, logo_url,
  is_active, sort_order
- `hero_slides` — id, title, subtitle, image_url, product_id,
  product_slug, cta_text, is_active, sort_order
- `carts` — id, user_id, session_id, items (JSONB)
- `newsletter_subscribers` — id, email, subscribed_at, source, is_active
- `newsletter_attempts` — rate limiting (max 10 per email per 24h)
- `banners` — announcement bar content (RLS enabled)
- `wishlists` — id, user_id, product_id, created_at
- `product_variants` — 653 rows, Zinatex size/color variants
- `sale_events` — infrastructure exists, 0 active rows
- `sale_event_products` — infrastructure exists, 0 active rows
- `discount_codes` — WELCOME10 seeded (10% off, one-time per email)
- `discount_redemptions` — unique(code, email) enforces server-side one-time use

## Admin RPCs (service_role only — anon/authenticated EXECUTE revoked)
- `get_manufacturer_counts` — product counts by manufacturer
- `get_category_counts` — product counts by category
- `get_categories_by_manufacturer` — filtered category list
- `get_stock_totals` — in-stock vs OOS totals

## Manufacturers (products.manufacturer column values)
- `Nationwide FD` | `United Furniture` | `ACME` | `Zinatex`
- `Artisan` | `Interpraise` — is_active = false, hidden from storefront

## ACME Product Types (acme_product_type column)
- `kit` — parent set product, shown in storefront
- `single` — standalone product, shown in storefront
- `single_additional` — shown in storefront
- `component` — individual pieces, in_stock = false, hidden from browse/search
  but have their own PDPs. Show "Part of this set" link back to parent KIT.
  88% of 2,733 components have acme_kit_parent_sku populated.

## Display Name Conventions (per manufacturer)
- **NFD:** label above H1 = `collection_group` (e.g. B101); H1 = `{sku} — {piece_type}`
- **ACME:** label = `product.sku`; H1 = `display_name` (text before first ` — ` in description)
- **United Furniture:** label = `page_id` (e.g. B020); H1 = `description` + joined `bundle_skus`
- **Zinatex:** label = `product.collection` (design series); H1 = `product.name` as stored

## Pricing Rules (confirmed March 2026)
- ACME: `west_price × 2.6`
- United Furniture: `MSRP` column directly (compare_at_price = MSRP)
- Nationwide FD: `itemPrice × 2.2`
- Zinatex: `(MSRP / 4) × 2.2`
- Illinois sales tax: 10.25% applied server-side at checkout only

## Auth Rules
- Supabase Auth only — Google OAuth via PKCE flow
- Server-side: `supabase.auth.getUser()`
- Client-side: `supabase.auth.getSession()`
- Admin check: `isAdmin(user)` — verify server-side on ALL admin routes
- NEVER use Clerk — it is not installed

## Stripe
- Webhook: `https://www.amazinghomefurniturestore.com/api/webhooks/stripe`
- CRITICAL: Must use www domain — non-www causes 307 redirect Stripe won't follow
- Raw body required: use `request.arrayBuffer()` not `request.json()`
- Order flow: checkout creates pending → Stripe webhook → updates to paid + Resend email
- Discount: WELCOME10 validated server-side at checkout, enforced via discount_redemptions
- Status: TEST MODE — awaiting client live Stripe account + bank connection

## Inventory Sync Cron Jobs
- `app/api/cron/sync-zinatex/route.ts` — every 6h, LIVE
  Source: https://zinatexrugs.com/wp-content/uploads/woo-feed/custom/csv/zinatexproductfeed.csv
  No auth needed. Updates in_stock, price `(MSRP/4)*2.2`, images[0].
- `app/api/cron/sync-nfd/route.ts` — daily 3am, SKELETON (awaiting credentials)
  Needs: NFD_PORTAL_EMAIL, NFD_PORTAL_PASSWORD, NFD_PORTAL_CSV_URL
- `app/api/cron/sync-united/route.ts` — daily 3am, SKELETON (awaiting credentials)
  Needs: UNITED_PORTAL_EMAIL, UNITED_PORTAL_PASSWORD
  Download URL: https://cms.amptab.com/Manufacturer/169382/Shop2DownloadPublication?fileId=1645225683
- Shared utility: `lib/cron-utils.ts` — validateCronSecret, parseCSVStream, batchUpsertProducts
- All routes secured with Authorization: Bearer ${CRON_SECRET} header check
- ACME cron: pending response from manufacturer on API/feed availability

## Security Rules (Non-Negotiable)
- All API keys in .env only — never hardcoded
- Tax calculated server-side only — never trust client
- All admin routes verify isAdmin() server-side before any operation
- Supabase writes use SERVICE_ROLE_KEY — reads use ANON_KEY
- All image URLs validated as https:// before storing or rendering
- Use next/image for ALL images — never raw <img> tags
- Parameterized queries only — no string concatenation into SQL
- RLS enabled on all 13 tables (banners now included)
- Excess privileges revoked from anon/authenticated on all tables
- EXECUTE revoked from anon/authenticated on all SECURITY DEFINER functions
- Newsletter rate limit: 10 inserts per email per 24h (enforced via RLS WITH CHECK)

## Image Domains (next.config.mjs remotePatterns)
- `lh3.googleusercontent.com` (Google avatars)
- `img.clerk.com` (legacy — keep for safety)
- `zinatexrugs.com` (Zinatex rug images)
- `d28fw8vtnbt3jx.cloudfront.net` (United Furniture CDN)
- `www.acmecorp.com` (ACME product images)
- `nationwidefd.com` + subdomains (NFD images, direct next/image — no proxy needed)
- NFD images that fail: go through `/api/image-proxy` route as fallback only

## Homepage Section Order (zero gaps between sections)
1. HeroSlideshow (85vh, real product images, DB-controlled)
2. TrustBar (Free Shipping $299+ | Financing | Illinois Business)
3. ManufacturerSection "Shop by Brand" (charcoal bg, logo cards)
4. CategoryGrid (edge-to-edge tiles, real product images, text overlay)
5. SaleSection (only renders if on_sale products exist)
6. RugsSpotlight "Premium Rugs by Zinatex" (forest green bg)
7. FinancingSection (Synchrony + Koalafi external links only)
8. NewsletterSection

## Policies
- Returns: ALL SALES FINAL after delivery/installation
  Damaged items: report within 48 hours with photos
- No 30-day returns — remove any reference found
- No 2-year warranty — remove any reference found
- Financing partners: Synchrony and Koalafi ONLY (not Snap Finance)
- Free shipping on all orders over $299

## Customer Features (all built and live)
- Guest cart → authenticated cart merge (useRef guard, fires once on SIGNED_IN)
- /account — dashboard with welcome card, recently viewed products
- /account/orders — order history with FedEx-style timeline
- /account/orders/[id] — order detail page
- /account/wishlist — wishlist mood board
- /account/profile — profile editor with saved address (stored in profiles table)
- /order-confirmation/[orderId] — dedicated bookmarkable confirmation page
- /discover — TikTok-style vertical product reel (SSR, force-dynamic)
- Idle discount popup — fires after inactivity, collects email, issues WELCOME10

## Checkout Features
- 4-step progress bar
- Sticky order summary sidebar
- Promo code field (WELCOME10 — 10% off, one-time per email, server-enforced)
- Tax: 10.25% Illinois, server-side only

## Admin Features (all at /admin/*)
- Products page: server-side pagination (50/page), ILIKE search, manufacturer/category filters
- Filter counts via RPCs (not client-side aggregation — avoids Supabase row limit bug)
- Image validation endpoint (batched 50-100/request to avoid 504 timeout)
- Banner management

## CSV Source Files (for re-imports)
- Nationwide FD: `C:\Users\mshob\OneDrive\csv for AHF\NFD datasheet.xlsx`
- United Furniture: `C:\Users\mshob\OneDrive\csv for AHF\united datasheet.csv`
- ACME: `C:\Users\mshob\OneDrive\csv for AHF\acme datasheet.xlsx`
- Zinatex main: `C:\Users\mshob\OneDrive\csv for AHF\zinat datasheet.csv`
- Zinatex inventory: `C:\Users\mshob\OneDrive\csv for AHF\zinat sku and inventory number.csv`

## Known Pending Items (in priority order)
1. **Stripe go-live** — client needs to create live Stripe account, connect bank,
   provide live publishable key + secret key + webhook signing secret.
   Then: 3 Vercel env var swaps and re-register webhook in live dashboard.
2. **NFD + United cron credentials** — get portal logins from client.
   Add env vars to Vercel, redeploy. No code changes needed.
3. **ACME images** — ~1,383 products still have placeholder images.
   fix-acme-images.ts script drafted but not confirmed run.
4. **Zinatex full variant re-import** — source has 3,515 variants across 517 designs,
   DB only has ~853. Full re-import script needed.
5. **United Furniture product names** — all 2,192 products still have raw SKU names.
   Needs name rewrite treatment (same as NFD/ACME).
6. **ACME cron** — awaiting manufacturer response on API/FTP feed availability.
7. **Replace xlsx with exceljs** — xlsx has unpatched high severity npm vulnerability.
   Only used in local import scripts, not web runtime. Low urgency.
8. **/discover force-dynamic** — add `export const dynamic = 'force-dynamic'`
   to suppress Next 15 build warning (non-breaking, cosmetic fix).
9. **Financing page referral links** — replace generic Synchrony/Koalafi URLs
   with dealer-specific referral links (already correct on homepage).
10. **Zinatex OOS strategy** — 561 rugs OOS (63%). Decide: hide, badge, or leave.
11. **Helcim evaluation** — medium-term: evaluate migration from Stripe for
    interchange-plus pricing. Enable Stripe ACH as immediate interim option.

## Conventions
- Slugs: lowercase, hyphens, append -[manufacturer_code]-[sku]
  e.g. `king-bed-nfd-b101`, `motion-recliner-acme-00626`
- Migrations: `supabase/migrations/[timestamp]_description.sql`
- Admin routes: `app/(admin)/admin/[feature]/page.tsx`
- Store routes: `app/(store)/[feature]/page.tsx`
- API routes: `app/api/[feature]/route.ts`
- Cron routes: `app/api/cron/sync-[manufacturer]/route.ts`

## Critical Learnings (do not repeat these mistakes)
- **Always query live DB before writing prompts.** Never assume state from prior context.
- **Supabase JS row limit (~1,000) is a silent failure mode.** Use `.range()` or RPCs for counts.
- **PostgREST does not support array index notation** (e.g. images[1]) in filters.
  Filter array contents in JS after query returns.
- **apply_migration for writes, execute_sql for reads.**
- **Verify immediately after every write** with a follow-up count query.
- **Trigger execution order is alphabetical** by name for same-timing triggers.
- **SECURITY DEFINER functions** must have EXECUTE explicitly revoked from anon/authenticated.
- **RLS alone is not defense-in-depth.** Explicitly revoke excess table-level grants.
- **NFD image limitation is a hard manufacturer constraint** — only collection-level
  room scenes exist in source. No per-SKU photography available.
- **ACME components must stay hidden from browse/search** — in_stock = false is the
  only storefront visibility mechanism. No separate is_visible column.
- **Next.js 15 async params** — all server components using params/searchParams/headers
  must await them. Already fixed across account/order/sale pages.
- **Cursor prompt format:** natural language only — no inline code snippets.
  Prompts must be paste-ready and self-contained.
