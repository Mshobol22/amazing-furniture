import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth/admin-access";
import { Button } from "@/components/ui/button";
import { Package, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

function formatMemberSince(iso: string) {
  const d = new Date(iso);
  return `Member since ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

export default async function AccountDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? "/account";
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Member";
  const first = displayName.split(/\s+/)[0] ?? displayName;
  const memberLine = formatMemberSince(user.created_at);

  const [{ count: orderCount }, { count: wishlistCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("wishlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const ordersTotal = orderCount ?? 0;
  const wishesTotal = wishlistCount ?? 0;
  const isAdmin = isAdminUser(user);

  return (
    <div className="space-y-8">
      {isAdmin ? (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-charcoal/10 bg-charcoal p-5 text-cream sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold">Administrator</p>
            <p className="text-xs text-cream/70">You have access to the store dashboard.</p>
          </div>
          <Button
            asChild
            className="bg-[#2D4A3E] text-cream hover:bg-[#1E3329]"
          >
            <Link href="/admin">Open admin</Link>
          </Button>
        </div>
      ) : null}

      <div>
        <h1 className="font-sans text-2xl font-semibold text-charcoal sm:text-3xl">
          Welcome back, {first}
        </h1>
        <p className="mt-2 text-sm text-warm-gray">{memberLine}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-warm-gray">Total orders</p>
          <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-charcoal">
            {ordersTotal}
          </p>
        </div>
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-warm-gray">Wishlist items</p>
          <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-charcoal">
            {wishesTotal}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          asChild
          className="bg-[#2D4A3E] text-cream hover:bg-[#1E3329]"
        >
          <Link href="/account/orders" className="inline-flex items-center gap-2">
            <Package className="h-4 w-4" />
            View orders
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-[#2D4A3E] text-[#2D4A3E] hover:bg-[#2D4A3E]/10">
          <Link href="/account/wishlist" className="inline-flex items-center gap-2">
            <Heart className="h-4 w-4" />
            View wishlist
          </Link>
        </Button>
      </div>
    </div>
  );
}
