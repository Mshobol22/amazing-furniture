import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL_ALLOWLIST = new Set(["amazinghome80@gmail.com"]);

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminUser(user: Pick<User, "email" | "app_metadata"> | null): boolean {
  if (!user) return false;

  const email = normalizeEmail(user.email);
  const hasAdminRole = user.app_metadata?.role === "admin";
  const isAllowlistedEmail = ADMIN_EMAIL_ALLOWLIST.has(email);

  return hasAdminRole || isAllowlistedEmail;
}
