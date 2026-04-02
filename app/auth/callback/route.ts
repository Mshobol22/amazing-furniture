import { safeAuthRedirectPath } from "@/lib/auth-redirect";
import { profileRowFromAuthUser } from "@/lib/auth/profile-from-user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = safeAuthRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
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

  return NextResponse.redirect(`${origin}${nextPath}`);
}
