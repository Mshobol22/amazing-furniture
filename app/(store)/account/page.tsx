import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth/admin-access";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-price";
import {
  OrderStatusBadge,
  isPendingOrProcessingStatus,
} from "@/lib/account/order-status-badge";
import RecentlyViewedStrip from "@/components/account/RecentlyViewedStrip";

export const metadata: Metadata = {
  title: "Dashboard",
};

type OrderSummary = {
  id: string;
  status: string;
  total: number;
  created_at: string;
};

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function profileCompletenessPercent(profile: ProfileRow | null, sessionEmail: string): number {
  const checks = [
    Boolean(profile?.full_name?.trim()),
    Boolean(profile?.phone?.trim()),
    Boolean(sessionEmail?.trim()),
    Boolean(profile?.address_line1?.trim()),
    Boolean(profile?.city?.trim()),
    Boolean(profile?.state?.trim()),
    Boolean(profile?.zip?.trim()),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function hasShippingAddress(profile: ProfileRow | null): boolean {
  return Boolean(
    profile?.address_line1?.trim() &&
      profile?.city?.trim() &&
      profile?.state?.trim() &&
      profile?.zip?.trim()
  );
}

export default async function AccountDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=%2Faccount");
  }

  const first =
    (user.user_metadata?.full_name as string | undefined)?.split(/\s+/)[0] ??
    (user.user_metadata?.name as string | undefined)?.split(/\s+/)[0] ??
    user.email?.split("@")[0] ??
    "Member";

  const [
    ordersCountRes,
    wishlistCountRes,
    recentOrdersRes,
    profileRes,
    allOrdersRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("wishlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("orders")
      .select("id, status, total, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("profiles")
      .select(
        "full_name, phone, email, address_line1, city, state, zip, country"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("orders").select("status").eq("user_id", user.id),
  ]);

  const ordersTotal = ordersCountRes.count ?? 0;
  const wishlistTotal = wishlistCountRes.count ?? 0;
  const recentOrders = (recentOrdersRes.data ?? []) as OrderSummary[];
  const profile = profileRes.data as ProfileRow | null;

  const pendingProcessingCount = (allOrdersRes.data ?? []).filter((row) =>
    isPendingOrProcessingStatus(String((row as { status: string }).status))
  ).length;

  const completePct = profileCompletenessPercent(profile, user.email ?? "");
  const showAddressNudge = !hasShippingAddress(profile);
  const isAdmin = isAdminUser(user);

  return (
    <div className="space-y-8">
      {isAdmin ? (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-charcoal/10 bg-charcoal p-5 text-cream sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold">Administrator</p>
            <p className="text-xs text-cream/70">You have access to the store dashboard.</p>
          </div>
          <Button asChild className="bg-[#2D4A3E] text-cream hover:bg-[#1E3329]">
            <Link href="/admin">Open admin</Link>
          </Button>
        </div>
      ) : null}

      <div>
        <h1 className="font-sans text-2xl font-semibold text-charcoal sm:text-3xl">
          Welcome back, {first}
        </h1>
        <p className="mt-1 text-sm text-warm-gray">Here&apos;s a snapshot of your account.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-warm-gray">Total orders</p>
          <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-charcoal">
            {ordersTotal}
          </p>
        </div>
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-warm-gray">
              Pending / processing
            </p>
            {pendingProcessingCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {pendingProcessingCount}
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-charcoal">
            {pendingProcessingCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-warm-gray">Wishlist items</p>
          <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-charcoal">
            {wishlistTotal}
          </p>
        </div>
        <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-warm-gray">Profile</p>
          <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-charcoal">
            {completePct}%{" "}
            <span className="text-base font-normal text-warm-gray">complete</span>
          </p>
          {completePct < 100 ? (
            <Link
              href="/account/profile"
              className="mt-2 inline-block text-sm font-medium text-[#2D4A3E] hover:underline"
            >
              Add phone &amp; address
            </Link>
          ) : null}
        </div>
      </div>

      {showAddressNudge ? (
        <div className="rounded-xl border border-[#2D4A3E]/25 bg-[#2D4A3E]/5 p-5">
          <p className="font-medium text-charcoal">Complete your profile to make checkout faster</p>
          <p className="mt-1 text-sm text-warm-gray">Save your default shipping address for next time.</p>
          <Button asChild className="mt-4 bg-[#2D4A3E] text-cream hover:bg-[#1E3329]">
            <Link href="/account/profile">Go to profile</Link>
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm">
        <div className="border-b border-light-sand px-6 py-4">
          <h2 className="font-sans text-lg font-semibold text-charcoal">Recent orders</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-warm-gray">No orders yet.</div>
        ) : (
          <ul className="divide-y divide-light-sand">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm text-charcoal">
                    #{order.id.slice(0, 8).toUpperCase()}…
                  </p>
                  <p className="text-sm text-warm-gray">{formatOrderDate(order.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span className="font-sans font-semibold tabular-nums text-charcoal">
                    {formatPrice(Number(order.total) || 0)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="text-sm font-medium text-[#2D4A3E] hover:underline"
                  >
                    View order
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RecentlyViewedStrip />
    </div>
  );
}
