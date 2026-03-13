"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Heart,
  CreditCard,
  Settings,
  Package,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWishlistCount } from "@/store/wishlistStore";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/30 text-yellow-200",
  paid: "bg-green-500/30 text-green-200",
  shipped: "bg-blue-500/30 text-blue-200",
  delivered: "bg-green-500/30 text-green-200",
  cancelled: "bg-red-500/30 text-red-200",
  processing: "bg-blue-500/30 text-blue-200",
};

interface OrderRow {
  id: string;
  items: unknown;
  total: number;
  status: string;
  created_at: string;
}

interface CustomerProfileProps {
  user: User;
  orders: OrderRow[];
}

function getItemCount(items: unknown): number {
  if (Array.isArray(items)) return items.length;
  return 0;
}

export default function CustomerProfile({ user, orders }: CustomerProfileProps) {
  const router = useRouter();
  const wishlistCount = useWishlistCount();

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const cards = [
    {
      icon: ShoppingBag,
      title: "My Orders",
      subtitle: "Track your purchases",
      href: "/account/orders",
    },
    {
      icon: Heart,
      title: "Wishlist",
      subtitle: "Your saved items",
      href: "/account/wishlist",
    },
    {
      icon: CreditCard,
      title: "Financing",
      subtitle: "Payment options",
      href: "/financing",
    },
    {
      icon: Settings,
      title: "Settings",
      subtitle: "Account preferences",
      href: "/account/settings",
    },
  ];

  return (
    <div className="min-h-screen noise-overlay page-account-customer pb-24">
      {/* Section 1 — Hero profile header */}
      <div className="pt-16 pb-10 px-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#8B6914] text-2xl font-medium text-white">
          {initial}
        </div>
        <h1 className="mt-4 font-display text-3xl text-white">{displayName}</h1>
        <p className="mt-1 text-sm text-[#a0c4a8]">{user.email}</p>
        {memberSince && (
          <p className="mt-2 text-xs text-[#6b9b75]">Member since {memberSince}</p>
        )}
        {wishlistCount > 0 && (
          <span className="mt-3 inline-block rounded-full border border-[#8B6914]/40 bg-[#8B6914]/20 px-3 py-1 text-xs text-[#8B6914]">
            ♥ {wishlistCount} {wishlistCount === 1 ? "item" : "items"} saved
          </span>
        )}
      </div>

      {/* Section 2 — Quick action cards */}
      <div className="mx-auto max-w-2xl px-4 mt-8 grid grid-cols-2 gap-4 sm:flex sm:flex-row sm:flex-wrap sm:justify-center">
        {cards.map(({ icon: Icon, title, subtitle, href }) => (
          <Link
            key={href}
            href={href}
            className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
          >
            <Icon className="h-7 w-7 text-[#8B6914]" />
            <p className="mt-3 text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-[#6b9b75]">{subtitle}</p>
          </Link>
        ))}
      </div>

      {/* Section 3 — Recent Orders */}
      <div className="mx-auto max-w-2xl px-4 mt-8 pb-16">
        <h2 className="mb-4 font-display text-xl text-white">Recent Orders</h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 py-16">
            <Package className="h-10 w-10 text-[#6b9b75]" />
            <p className="mt-2 text-sm text-[#a0c4a8]">No orders yet</p>
            <Button asChild className="mt-4 rounded-lg bg-[#8B6914] px-6 py-2 text-white hover:bg-[#6d5210]">
              <Link href="/collections/all">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <p className="font-mono text-xs text-[#8B6914]">
                  {order.id.slice(0, 12)}...
                </p>
                <p className="mt-1 text-xs text-[#a0c4a8]">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
                <span
                  className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${
                    STATUS_STYLES[order.status] ?? "bg-gray-500/30 text-gray-200"
                  }`}
                >
                  {order.status}
                </span>
                <p className="mt-2 font-medium text-white">
                  ${Number(order.total).toLocaleString()}
                </p>
                <Link
                  href="#"
                  className="mt-2 inline-block text-xs text-[#8B6914] hover:underline"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center border-t border-white/10 bg-[#0D2818]/95 p-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-6 py-2 text-white/60 transition-colors hover:border-white hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
