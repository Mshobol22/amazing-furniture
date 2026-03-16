import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSidebar from "../AccountSidebar";
import ProfileForm from "@/components/account/ProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Amazing Home Furniture",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <AccountSidebar
            user={{
              displayName,
              email: user.email ?? "",
              initials,
              avatarUrl: user.user_metadata?.avatar_url,
            }}
          />
          <main className="flex-1">
            <div className="rounded-lg border border-light-sand bg-white p-6 sm:p-8">
              <h2 className="mb-6 font-display text-2xl font-semibold text-charcoal">
                Profile Settings
              </h2>
              <ProfileForm
                displayName={displayName}
                email={user.email ?? ""}
                initials={initials}
                avatarUrl={user.user_metadata?.avatar_url}
                memberSince={memberSince}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
