import { safeAuthRedirectPath } from "@/lib/auth-redirect";
import { profileRowFromAuthUser } from "@/lib/auth/profile-from-user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeAuthRedirectPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=auth", requestUrl.origin));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=auth", requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(profileRowFromAuthUser(user), { onConflict: "user_id" });
    if (profileError) {
      console.error("auth callback profile upsert:", profileError.message);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
