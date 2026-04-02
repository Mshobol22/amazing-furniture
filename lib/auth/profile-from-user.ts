import type { User } from "@supabase/supabase-js";

export function profileRowFromAuthUser(user: User) {
  const provider = user.app_metadata?.provider;
  const auth_provider = provider === "google" ? "google" : "email";
  const fullName = user.user_metadata?.full_name;
  const phone = user.user_metadata?.phone;
  return {
    user_id: user.id,
    email: user.email ?? null,
    full_name: typeof fullName === "string" ? fullName : null,
    phone: typeof phone === "string" ? phone : null,
    auth_provider,
    updated_at: new Date().toISOString(),
  };
}
