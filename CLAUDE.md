# Amazing Home Furniture Store — CLAUDE.md
> Last updated: March 26, 2026 | Read this fully before touching any code.

## Project
- **Site:** https://www.amazinghomefurniturestore.com
- **Repo:** github.com/Mshobol22/amazing-furniture (branch: main)
- **Local:** C:\Users\mshob\OneDrive\Desktop\amazing furniture\
- **Deploy:** Vercel (auto-deploy on push to main)

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase (auth + DB) — Auth is Supabase Auth with Google OAuth. NOT Clerk.
- Stripe (payments + webhooks), Resend (email), shadcn/ui
- Deployed on Vercel
- Product counts: 6,584 total | 5,682 in stock | 902 out of stock

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
  collection, dimensions (JSONB), compare_at_price, warranty
- `orders` — id, user_id, items (JSONB), subtotal, shipping, total,
  tax_amount, tax_rate, status, stripe_payment_intent_id,
  customer_name, customer_email, shipping_address (JSONB)
- `manufacturers` — id, name, slug, description, logo_url,
  is_active, sort_order
- `hero_slides` — id, headline, subheading, image_url, product_name,
  product_slug, cta_label, cta_href, is_active, sort_order
- `carts` — id, user_id, session_id, items (JSONB)
- `newsletter_subscribers` — id, email, subscribed_at, source, is_active
- `newsletter_attempts` — rate limiting table
- `banners` — announcement bar content
- `sale_events` — id, name, start_date, end_date, is_active
- `sale_event_products` — sale_event_id, product_id
- `wishlists` — id, user_id, created_at
- `wishlist_items` — id, wishlist_id, product_id
- `product_variants` — id, product_id, variant data (653 variants exist)
NOTE: `promotions` table does NOT exist — remove any reference to it.

## Product Name Convention (CRITICAL)
Product `name` column now stores the manufacturer item code, NOT a
descriptive name. The original descriptive name is preserved in `description`.

- **ACME:** `name` = ACME item number (e.g. `AC03801`, `70325`, `BD01410`)
- **Nationwide FD:** `name` = NFD item code (e.g. `B107KB`, `D99T`, `U18C`)
- **United Furniture:** `name` = SKU code (e.g. `U244-C`, `B271-KDMCN`)
- **Zinatex:** `name` = design name as-is (e.g. `BURSA Rug Design 55331`)

When displaying products, show `name` as the product title. The `description`
field contains the human-readable item name prepended to the full description.
NEVER rename products back to descriptive names — this convention is intentional.

## Collection Field — Meaning Per Manufacturer
The `collection` field means different things per manufacturer:
- **ACME:** Product series/line name (e.g. "Vendome II", "Adara", "Aberdeen")
  Used for "Also in this collection" grouping on product pages.
  KIT products and their components share the same collection value.
- **United Furniture:** Product series name (e.g. "Closeout", "Tax Sale 2026")
  Used for "Also in this collection" grouping.
- **Nationwide FD:** Null for most products — no collection grouping.
- **Zinatex:** Rug category/style (e.g. "Premium", "5D Shaggy", "Casablanca",
  "Sultan", "Marble", "Bursa"). Used for the Category filter on the Zinatex
  brand page ONLY. Filter sidebar on /brands/zinatex filters by `collection`,
  not `category` (all Zinatex products have category = "rug").

## Zinatex Brand Page — Special Filter Behavior
- Category filter reads from `products.collection` (not `products.category`)
- Options loaded dynamically: SELECT DISTINCT collection FROM products
  WHERE manufacturer = 'Zinatex' ORDER BY collection
- Filter persists in URL as ?collection=Shaggy
- All other brand pages filter by `category` as normal

## Manufacturers (in products.manufacturer column)
- `Nationwide FD` | `United Furniture` | `ACME` | `Zinatex`
- `Artisan` | `Interpraise` — set is_active=false, no products yet

## Catalog Display Settings
- Products per page: **15** on all catalog pages (brand, collection, browse-all)
- Grid: 3 columns on desktop
- Product card: large aspect-square image, name (SKU code), price, 
  "Explore brand" + "Explore pieces" buttons side by side below image
- Price formatting: ALWAYS use minimumFractionDigits: 2 — never show $1,977.8

## Pricing Rules
- ACME: west_price × 2.5 + $300 (covers free shipping cost)
- United Furniture: MAP price as listed
- Nationwide FD: price as listed
- Zinatex: MSRP as listed
- Illinois sales tax: 10.25% applied server-side at checkout

## Image Rules & State (March 2026)
- **ACME:** Each product has its own SKU-based image URL from acmecorp.com CDN.
  Format: `https://www.acmecorp.com/media/catalog/product/[x]/[y]/[sku].jpg`
  ~1,383 products still have placeholder images — ACME CSV re-import needed.
  Comma-separated image URLs in CSV must be split into individual array elements.
- **United Furniture:** Piece-specific images promoted to images[1] via DB migration
  (March 26, 2026). 1,064 products now show individual piece photos. Bundles/sets
  retain the full collection room scene as primary image.
  Solo images available in "Images - Solo" column of united datasheet.csv —
  a full re-import using that column is still pending.
- **Nationwide FD:** One room scene per collection — no piece-specific URLs available
  from NFD CDN. Images served through /api/image-proxy (URL-encode spaces in path).
- **Zinatex:** Images hosted on zinatexrugs.com CDN.

## Image Domains (next.config.mjs remotePatterns)
- `lh3.googleusercontent.com` (Google avatars)
- `img.clerk.com` (legacy — keep for safety)
- `zinatexrugs.com` (Zinatex rug images)
- `d28fw8vtnbt3jx.cloudfront.net` (United Furniture CDN)
- `www.acmecorp.com` (ACME product images)
- Nationwide FD images go through `/api/image-proxy` route

## Auth Rules
- Supabase Auth only — Google OAuth via PKCE flow
- Server-side: `supabase.auth.getUser()`
- Client-side: `supabase.auth.getSession()`
- Admin check: `isAdmin(user)` function — verify server-side on ALL admin routes
- NEVER use Clerk — it is not installed

## Stripe
- Webhook endpoint: `https://www.amazinghomefurniturestore.com/api/webhooks/stripe`
- Webhook event: `payment_intent.succeeded`
- CRITICAL: Webhook must use www domain — non-www causes 307 redirect
- Raw body required: use `request.arrayBuffer()` not `request.json()`
- Order flow: checkout creates pending order → Stripe fires webhook →
  webhook updates order to paid + sends Resend confirmation email

## Security Rules (Non-Negotiable)
- All API keys in .env only — never hardcoded
- Tax calculated server-side only — never trust client
- All admin routes verify isAdmin() server-side before any operation
- Supabase writes use SERVICE_ROLE_KEY — reads use ANON_KEY
- All image URLs validated as https:// before storing or rendering
- Use next/image for ALL images — never raw <img> tags
- Parameterized queries only — no string concatenation into SQL
- RLS enabled on all tables
- banners table: needs RLS enabled (currently missing — known issue)
- orders table: "service role" policy is overly broad — known security issue

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

## CSV Source Files (for re-imports)
- Nationwide FD: `C:\Users\mshob\OneDrive\csv for AHF\NFD datasheet.xlsx`
- United Furniture: `C:\Users\mshob\OneDrive\csv for AHF\united datasheet.csv`
- ACME: `C:\Users\mshob\OneDrive\csv for AHF\acme datasheet.xlsx`
- Zinatex main: `C:\Users\mshob\OneDrive\csv for AHF\zinat datasheet.csv`
- Zinatex inventory: `C:\Users\mshob\OneDrive\csv for AHF\zinat sku and inventory number.csv`

## Known Bugs — Pending (in priority order)
1. **Cart merge** — guest cart disappears on sign-in
2. **ACME placeholder images** — 1,383 products showing placeholder (pending client decision)
3. **Image proxy** — NFD URL encoding errors still occurring (Prompt 1 addresses this)
4. **Collection field gaps** — NFD 0/729, UF 1,631/2,192 missing (Prompt 5 addresses this)
5. **Discover page SSR** — shows "Loading discover..." for search engines

## Completed Changes (March 26, 2026)
- ✅ Product names → SKU codes for ACME, Nationwide FD, United Furniture
- ✅ Zinatex descriptions trimmed to first sentence (887 products)
- ✅ Zinatex collection field populated from CSV (872/887 products matched)
- ✅ Zinatex brand page filter uses collection field (real rug categories)
- ✅ United Furniture piece-specific images promoted to position 1 (1,064 products)
- ✅ Products per page changed to 15 across all catalog pages
- ✅ Duplicate filter sidebar bug fixed
- ✅ Product card buttons (Explore brand / Explore pieces) side by side
- ✅ Sticky sidebar — no more blank whitespace below filter panel
- ✅ Price formatting fixed (minimumFractionDigits: 2) site-wide
- ✅ ACME "Also in this collection" section now renders

## Conventions
- Slugs: lowercase, hyphens, append -[manufacturer_code]-[sku]
  e.g. `king-bed-nfd-b101`, `motion-recliner-acme-00626`
- Migrations: `supabase/migrations/[timestamp]_description.sql`
- Admin routes: `app/(admin)/admin/[feature]/page.tsx`
- Store routes: `app/(store)/[feature]/page.tsx`
- API routes: `app/api/[feature]/route.ts`
- Do NOT run apply_migration for data updates — use execute_sql or scripts
- Filter state must use URL search params (not useState) for back-nav persistence
