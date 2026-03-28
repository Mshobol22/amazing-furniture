import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileSignOut from "@/components/account/ProfileSignOut";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function AccountProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? "/account/profile";
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Member";
  const initials = displayName
    .split(/\s+/)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ProfileSignOut
      displayName={displayName}
      email={user.email ?? ""}
      avatarUrl={user.user_metadata?.avatar_url}
      initials={initials}
    />
  );
}
