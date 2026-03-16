# Amazing Furniture — Claude Code Project Bible

## Project Overview
Premium home furniture ecommerce store. Live at: https://amazing-furniture.vercel.app  
Goal: Build a world-class, conversion-optimized furniture shopping experience that competes with top-tier brands like Article, Floyd, and Hem.

---

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Payments**: Stripe
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

---

## Design Direction
- **Aesthetic**: Luxury/editorial — clean, warm, and refined. Think high-end furniture magazine.
- **Color Palette**: Warm whites, cream, charcoal, with muted earth tone accents
- **Typography**: Distinctive display font for headings (e.g. Cormorant Garamond or Playfair Display), clean sans-serif for body
- **Feel**: Spacious layouts, generous whitespace, large product photography, subtle animations
- **Mobile**: Fully responsive — mobile experience is as important as desktop
- **NO**: Generic AI aesthetics, purple gradients, overused fonts like Inter or Roboto

---

## Prioritized Feature Roadmap
Work through these in order:

### 🔴 Priority 1 — In Progress
1. **Branded loading screen** — animated logo reveal with brand colors, smooth transition into homepage
2. **Room inspiration cross-sell section** — "Shop the Look" editorial grid showing full room setups with tagged products
3. **Editorial copy improvements** — replace placeholder text with premium brand voice copy throughout

### 🟡 Priority 2 — Next Up
4. **Product filtering & search** — filter by category, material, color, price range
5. **Wishlist / Save for later** — user can save products (requires Clerk auth)
6. **Product image gallery** — multi-image viewer with zoom on product detail page

### 🟢 Priority 3 — Future
7. **Reviews & ratings system** — verified purchase reviews on product pages
8. **AR preview** — "See in your room" feature using device camera
9. **Admin dashboard** — product management, order tracking, inventory

---

## Security Standards (Non-Negotiable)
All code must follow these rules — no exceptions:

- **Secrets**: API keys and credentials go in `.env` ONLY. Never hardcoded. `.env` always in `.gitignore`
- **Never expose** secret keys to the client/frontend side
- **Input validation**: Sanitize ALL user inputs on both client AND server side
- **SQL**: Parameterized queries only — no string concatenation
- **Auth**: Verify permissions on every protected route, not just existence of user
- **Dependencies**: No packages with known CVEs. Pin versions.
- **Error messages**: Must not reveal system information or stack traces to users
- **OWASP Top 10**: All code must be protected against the full OWASP Top 10:
  - Injection (SQL, XSS, command injection)
  - Broken authentication
  - Sensitive data exposure
  - Security misconfiguration
  - Vulnerable & outdated components
  - Insufficient logging & monitoring

### After every major feature, run this internal security check:
1. Any hardcoded secrets or API keys? → Remove immediately
2. All user inputs validated and sanitized? → Both client + server
3. SQL injection protection on all queries?
4. Auth checks on every protected route?
5. Dependencies up to date with no known CVEs?
6. Error messages safe — not revealing system info?

---

## Code Conventions
- **Components**: Go in `/components` folder, one file per component
- **Pages**: Use Next.js App Router conventions (`/app` directory)
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Styling**: Tailwind utility classes only — no custom CSS files unless absolutely necessary
- **Types**: TypeScript strict mode — no `any` types
- **Images**: Always use Next.js `<Image>` component for optimization
- **Commits**: Descriptive commit messages — explain what changed and why

---

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```
Ask the user for these values when ready to connect services. Never assume or hardcode them.

---

## Development Workflow
1. Always run `npm run dev` to start the dev server
2. After making changes, run `npm run build` to catch type errors before deploying
3. Fix ALL build errors before moving to the next feature
4. Test on mobile viewport before marking any UI feature complete
5. Deploy to Vercel via `git push` — auto-deploys on main branch

---

## Inspiration Sites
These sites set the design bar we're aiming for:
- article.com — clean product photography, editorial feel
- floydHome.com — minimal, story-driven
- hem.com — Scandinavian luxury, typography-first

---

## Current Session Context
- Project is live on Vercel at amazing-furniture.vercel.app
- Transitioning workflow from Cursor → Claude Code + VS Code
- Owner operates as the business/product lead; Claude Code handles all development execution
- Claude.ai (separate chat) acts as CTO — providing strategy, prompts, and direction
- Start each session by reading this file fully before writing any code
