import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, Heart, LogOut } from "lucide-react";
import AccountSidebar from "./AccountSidebar";
import OrdersTab from "./OrdersTab";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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

  const isAdmin = user.app_metadata?.role === "admin";

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {isAdmin && (
          <div className="mb-6 flex items-center justify-between rounded-lg bg-[#1C1C1C] p-4">
            <div>
              <p className="text-sm font-semibold text-[#FAF8F5]">Administrator Account</p>
              <p className="text-xs text-[#8B6914]">You have admin access</p>
            </div>
            <Link
              href="/admin"
              className="rounded bg-[#8B6914] px-4 py-2 text-sm font-medium text-[#FAF8F5] transition-colors hover:bg-[#6d5210]"
            >
              Open Dashboard →
            </Link>
          </div>
        )}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left sidebar */}
          <AccountSidebar
            user={{
              displayName,
              email: user.email ?? "",
              initials,
              avatarUrl: user.user_metadata?.avatar_url,
            }}
          />

          {/* Main content */}
          <main className="flex-1">
            <Link
              href="/"
              className="mb-6 inline-flex items-center text-sm font-medium text-walnut hover:underline"
            >
              ← Continue Shopping
            </Link>
            <OrdersTab orders={orders ?? []} />
          </main>
        </div>
      </div>
    </div>
  );
}
