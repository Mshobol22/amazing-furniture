"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Package, User, Heart, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface AccountSidebarProps {
  user: {
    displayName: string;
    email: string;
    initials: string;
    avatarUrl?: string;
  };
}

export default function AccountSidebar({ user }: AccountSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="rounded-lg border border-light-sand bg-white p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col">
          {user.avatarUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full">
              <Image
                src={user.avatarUrl}
                alt={user.displayName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-walnut text-xl font-semibold text-cream">
              {user.initials}
            </div>
          )}
          <div className="text-center sm:text-left lg:text-center">
            <p className="font-sans font-medium text-charcoal">
              {user.displayName}
            </p>
            <p className="text-sm text-warm-gray">{user.email}</p>
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-walnut hover:bg-light-sand"
          >
            ← Continue Shopping
          </Link>
          <Link
            href="/account"
            className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
              pathname === "/account"
                ? "bg-light-sand font-medium text-charcoal"
                : "text-warm-gray hover:bg-light-sand hover:text-charcoal"
            }`}
          >
            <Package className="h-4 w-4" />
            Orders
          </Link>
          <Link
            href="/account/profile"
            className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
              pathname === "/account/profile"
                ? "bg-light-sand font-medium text-charcoal"
                : "text-warm-gray hover:bg-light-sand hover:text-charcoal"
            }`}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Link
            href="/account/wishlist"
            className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
              pathname === "/account/wishlist"
                ? "bg-light-sand font-medium text-charcoal"
                : "text-warm-gray hover:bg-light-sand hover:text-charcoal"
            }`}
          >
            <Heart className="h-4 w-4" />
            Wishlist
          </Link>
        </nav>

        <div className="mt-6 border-t border-light-sand pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-warm-gray hover:bg-light-sand hover:text-charcoal"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
