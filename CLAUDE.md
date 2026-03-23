# Amazing Home Furniture Store — CLAUDE.md
> Last updated: March 2026 | Read this fully before touching any code.

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

## Key IDs
- Supabase project: `exppyvqjqnnowtjgumfc`
- Vercel project: `prj_8tvkzfngOaapp5tmzasa4gqK9eC9`
- Vercel team: `team_pZsX8SevXweyB2MNyjBjYiD0`

## Brand Colors
- Cream: `#FAF8F5` | Charcoal: `#1C1C1C`
- Forest Green: `#2D4A3E` (primary accent — replaces all brown/walnut)
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
- `hero_slides` — id, title, subtitle, image_url, product_id,
  product_slug, cta_text, is_active, sort_order
- `carts` — id, user_id, session_id, items (JSONB)
- `newsletter_subscribers` — id, email, subscribed_at, source, is_active
- `newsletter_attempts` — rate limiting table
- `banners` — announcement bar content
- `promotions` — category-level promotions

## Categories (in products.category column) — 9 total
| Slug | Display Name | Subcategories |
|------|-------------|---------------|
| `bed` | Beds | Beds, Bunk Beds, Daybeds, Storage Beds |
| `bedroom-furniture` | Bedroom Furniture | Bedroom Sets, Dressers, Nightstands, Chests, Mirrors, Vanities |
| `sofa` | Sofas & Sectionals | Sofas, Sectionals, Loveseats, Reclining Sofas |
| `chair` | Chairs & Recliners | Accent Chairs, Dining Chairs, Recliners, Bar Stools |
| `table` | Dining & Tables | Dining Sets, Dining Tables, Coffee Tables, End Tables |
| `cabinet` | Cabinets & Storage | Cabinets & Storage, Buffets & Servers, Bookcases |
| `tv-stand` | TV Stands & Entertainment | TV Stands, Entertainment Centers, Floating Shelves |
| `rug` | Rugs & Floor Coverings | Area Rugs, Runner Rugs, Round Rugs (Zinatex brand) |
| `other` | More Furniture | Benches, Desks, Ottomans |
- Route: `/collections/[slug]` — all slugs above plus `all`
- Subcategory filtering uses `?type=` URL param (e.g. `?type=Sectionals`)

## Manufacturers (in products.manufacturer column)
- `Nationwide FD` | `United Furniture` | `ACME` | `Zinatex`
- `Artisan` | `Interpraise` (coming soon — no products yet)

## Pricing Rules
- ACME: west_price × 2.5 + $300 (covers free shipping cost)
- United Furniture: MAP price as listed
- Nationwide FD: price as listed
- Zinatex: MSRP as listed
- Illinois sales tax: 10.25% applied server-side at checkout

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
  and Stripe does not follow redirects
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

## Image Domains (next.config.mjs remotePatterns)
- `lh3.googleusercontent.com` (Google avatars)
- `img.clerk.com` (legacy — keep for safety)
- `zinatexrugs.com` (Zinatex rug images)
- `d28fw8vtnbt3jx.cloudfront.net` (United Furniture CDN)
- `www.acmecorp.com` (ACME product images)
- Nationwide FD images go through `/api/image-proxy` route

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

## Known Bugs Still Pending (run in this order)
1. Cart merge — guest cart disappears on sign-in
2. Homepage combined fixes — Unsplash images, manufacturer counts,
   returns page, Zinatex title, duplicate products
3. Brand logos + sale section — logo cards, On Sale Now section
4. Rug image fix + immersive gallery — missing images, zoom/spin
5. Prompt 8 — brand landing pages /brands/[slug]

## Conventions
- Slugs: lowercase, hyphens, append -[manufacturer_code]-[sku]
  e.g. `king-bed-nfd-b101`, `motion-recliner-acme-00626`
- Migrations: `supabase/migrations/[timestamp]_description.sql`
- Admin routes: `app/(admin)/admin/[feature]/page.tsx`
- Store routes: `app/(store)/[feature]/page.tsx`
- API routes: `app/api/[feature]/route.ts`
