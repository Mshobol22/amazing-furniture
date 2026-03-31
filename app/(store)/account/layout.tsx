import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "@/components/account/AccountNav";

export const metadata: Metadata = {
  title: "My Account",
};

function accountNavUserFromAuth(user: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}) {
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Member";
  const initials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return {
    displayName,
    initials,
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
  };
}

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = await headers();
    const path = h.get("x-pathname") ?? "/account";
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const navUser = accountNavUserFromAuth(user);

  return (
    <div className="min-h-[60vh] bg-[#FAF8F5]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AccountNav user={navUser} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
