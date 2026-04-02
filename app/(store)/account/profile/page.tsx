import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountProfileForm from "@/components/account/AccountProfileForm";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function AccountProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=%2Faccount%2Fprofile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, phone, email, auth_provider, address_line1, address_line2, city, state, zip, country"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const row = profile as Record<string, string | null> | null;

  const fullName =
    (row?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";

  const initial = {
    userId: user.id,
    email: user.email ?? "",
    authProvider: (row?.auth_provider as string | null) ?? null,
    appProvider: user.app_metadata?.provider as string | undefined,
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
    fullName,
    phone: (row?.phone as string) ?? "",
    addressLine1: (row?.address_line1 as string) ?? "",
    addressLine2: (row?.address_line2 as string) ?? "",
    city: (row?.city as string) ?? "",
    state: (row?.state as string) ?? "",
    zip: (row?.zip as string) ?? "",
    country: (row?.country as string) ?? "US",
  };

  return <AccountProfileForm initial={initial} />;
}
