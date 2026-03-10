"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, User, ShoppingBag, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCartStore, useCartItemCount } from "@/store/cartStore";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "Bed", slug: "bed" },
  { name: "Chair", slug: "chair" },
  { name: "Sofa", slug: "sofa" },
  { name: "Table", slug: "table" },
  { name: "Cabinet", slug: "cabinet" },
  { name: "TV Stands", slug: "tv-stand" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const isScrolled = useScrollPosition(50);
  const openCart = useCartStore((state) => state.openCart);
  const cartCount = useCartItemCount();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isHomepage = pathname === "/";
  const isTransparent = isHomepage && !isScrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isTransparent
          ? "bg-gradient-to-b from-black/40 to-transparent text-white"
          : "bg-cream text-charcoal shadow-sm"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            "font-display text-xl font-semibold tracking-tight",
            isTransparent ? "text-white" : "text-charcoal"
          )}
        >
          Amazing Furniture
        </Link>

        {/* Center nav - desktop only */}
        <div className="hidden md:flex md:items-center md:gap-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/collections/${cat.slug}`}
              className={cn(
                "text-sm font-medium transition-colors hover:opacity-80",
                isTransparent ? "text-white" : "text-charcoal"
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              isTransparent ? "text-white hover:bg-white/10" : "text-charcoal"
            )}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              isTransparent ? "text-white hover:bg-white/10" : "text-charcoal"
            )}
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
          </Button>
          <div className="relative inline-block">
            <Link href={user ? "/account" : "/login"}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9",
                  isTransparent ? "text-white hover:bg-white/10" : "text-charcoal"
                )}
                aria-label="Account"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>
            {user && (
              <span
                className="absolute right-0 top-0 h-2 w-2 rounded-full bg-green-500"
                aria-hidden
              />
            )}
          </div>
          <div className="relative inline-block">
            <Button
              variant="ghost"
              size="icon"
              onClick={openCart}
              className={cn(
                "h-9 w-9",
                isTransparent ? "text-white hover:bg-white/10" : "text-charcoal"
              )}
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
            </Button>
            {cartCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs bg-walnut text-cream hover:bg-walnut/90">
                {cartCount}
              </Badge>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 md:hidden",
                  isTransparent ? "text-white hover:bg-white/10" : "text-charcoal"
                )}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-cream">
              <SheetHeader>
                <SheetTitle className="font-display text-charcoal">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-4">
                <SheetClose asChild>
                  <Link
                    href="/"
                    className="font-display text-lg font-medium text-charcoal hover:text-walnut"
                  >
                    Home
                  </Link>
                </SheetClose>
                {CATEGORIES.map((cat) => (
                  <SheetClose asChild key={cat.slug}>
                    <Link
                      href={`/collections/${cat.slug}`}
                      className="text-charcoal hover:text-walnut"
                    >
                      {cat.name}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
