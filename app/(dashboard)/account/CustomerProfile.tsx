"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Settings,
  Package,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";
import type { User } from "@supabase/supabase-js";

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

export default function CustomerProfile({ user, orders }: CustomerProfileProps) {
  const router = useRouter();

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Welcome";
  const initial = (user?.email?.charAt(0) ?? "U").toUpperCase();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const isAdmin = user.app_metadata?.role === "admin";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const quickActionCards = [
    { label: "My Orders", icon: Package, href: "/account/orders", desc: "Track & manage" },
    { label: "Wishlist", icon: Heart, href: "/account/wishlist", desc: "Saved items" },
    { label: "Admin Panel", icon: Settings, href: "/admin", desc: "Store controls", adminOnly: true },
    { label: "Contact Us", icon: MessageSquare, href: "/contact", desc: "Get support" },
  ].filter((card) => !card.adminOnly || isAdmin);

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Hero panel — dark green */}
      <div className="relative bg-[#0D2818] pt-16 pb-20 overflow-hidden">
        <NoiseOverlay opacity={0.04} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-20 h-20 rounded-full bg-[#8B6914] flex items-center justify-center text-white text-3xl font-bold border-4 border-white/20 shrink-0">
            {initial}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-serif font-bold text-white">
              {displayName}
            </h1>
            <p className="text-white/60 text-sm mt-1">{user?.email}</p>
            <p className="text-white/40 text-xs mt-1">
              Member since {memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* Pull-up cards — cream area */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {quickActionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-[#8B6914]/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-[#FAF8F5] rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-[#8B6914]/10 transition-colors">
                <card.icon className="w-5 h-5 text-[#8B6914]" />
              </div>
              <div className="font-semibold text-sm text-[#1C1C1C]">{card.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{card.desc}</div>
            </Link>
          ))}
        </div>

        {/* Recent orders preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1C1C1C]">Recent Orders</h2>
            <Link href="/account/orders" className="text-sm text-[#8B6914] hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No orders yet</p>
              <Link
                href="/collections/all"
                className="mt-3 inline-block text-sm text-[#8B6914] hover:underline"
              >
                Start shopping →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/account/orders"
                  className="block rounded-lg border border-gray-100 p-4 hover:border-[#8B6914]/30 transition-colors"
                >
                  <p className="font-mono text-xs text-[#8B6914]">
                    {order.id.slice(0, 12)}...
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${
                      order.status === "delivered" || order.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : order.status === "cancelled"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                  <p className="mt-2 font-medium text-[#1C1C1C]">
                    ${Number(order.total).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="text-center pb-12">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
