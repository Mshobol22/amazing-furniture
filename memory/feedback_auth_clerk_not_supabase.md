---
name: Auth is Supabase, not Clerk — CLAUDE.md is outdated
description: Despite CLAUDE.md listing Clerk, the entire codebase uses Supabase Auth for authentication
type: feedback
---

The project uses **Supabase Auth** throughout — NOT Clerk. CLAUDE.md mentions Clerk in the tech stack but the actual implementation uses Supabase everywhere.

**Why:** The codebase was built with Supabase Auth. CLAUDE.md is outdated/incorrect on this point.

**How to apply:**
- Server components: use `createClient()` from `@/lib/supabase/server` → `supabase.auth.getUser()`
- Client components: use `createClient()` from `@/lib/supabase/client` → `supabase.auth.updateUser()` for profile updates
- Avatar/photo: `user.user_metadata.avatar_url` (Google OAuth photo)
- Display name: `user.user_metadata.full_name` or `user.user_metadata.name`
- Do NOT import or use any `@clerk/nextjs` packages
