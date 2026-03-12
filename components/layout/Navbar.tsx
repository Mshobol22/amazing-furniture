"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, User, ShoppingBag, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCartStore, useCartItemCount } from "@/store/cartStore";
import { useWishlistCount } from "@/store/wishlistStore";
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import NavbarSearch from "./NavbarSearch";

const CATEGORY_DROPDOWNS: Record<
  string,
  { name: string; slug: string; subcategories: { label: string; filter?: string }[] }
> = {
  bed: {
    name: "Beds & Bedroom",
    slug: "bed",
    subcategories: [
      { label: "All Beds" },
      { label: "Twin Beds", filter: "twin" },
      { label: "Full Beds", filter: "full" },
      { label: "Queen Beds", filter: "queen" },
      { label: "King Beds", filter: "king" },
      { label: "Bunk Beds", filter: "bunk" },
      { label: "Daybeds", filter: "daybed" },
    ],
  },
  sofa: {
    name: "Sofas & Sectionals",
    slug: "sofa",
    subcategories: [
      { label: "All Sofas" },
      { label: "Sectionals", filter: "sectional" },
      { label: "Reclining Sofas", filter: "reclining" },
      { label: "Sleeper Sofas", filter: "sleeper" },
      { label: "Sofa Chaise", filter: "chaise" },
    ],
  },
  chair: {
    name: "Chairs & Recliners",
    slug: "chair",
    subcategories: [
      { label: "All Chairs" },
      { label: "Recliners", filter: "recliner" },
      { label: "Accent Chairs", filter: "accent" },
      { label: "Lift Chairs", filter: "lift" },
      { label: "Power Recliners", filter: "power" },
    ],
  },
  table: {
    name: "Dining & Tables",
    slug: "table",
    subcategories: [{ label: "All Tables" }],
  },
  cabinet: {
    name: "Dressers & Cabinets",
    slug: "cabinet",
    subcategories: [
      { label: "All Storage" },
      { label: "Dressers", filter: "dresser" },
      { label: "Chest of Drawers", filter: "drawer" },
    ],
  },
  "tv-stand": {
    name: "TV Stands & Entertainment",
    slug: "tv-stand",
    subcategories: [{ label: "All TV Stands" }],
  },
};

function SubcategoryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} legacyBehavior passHref>
      <NavigationMenuLink
        className="block px-4 py-2 text-sm text-[#1C1C1C] hover:underline hover:decoration-[#8B6914] hover:decoration-2"
      >
        {children}
      </NavigationMenuLink>
    </Link>
  );
}

export default function Navbar() {
  const openCart = useCartStore((state) => state.openCart);
  const cartCount = useCartItemCount();
  const wishlistCount = useWishlistCount();
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

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FAF8F5] shadow-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-charcoal"
        >
          Amazing Home Furniture
        </Link>

        {/* Center nav - desktop only */}
        <div className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {Object.entries(CATEGORY_DROPDOWNS).map(([slug, cat]) => (
                <NavigationMenuItem key={slug}>
                  <NavigationMenuTrigger className="bg-transparent text-sm font-medium text-charcoal hover:bg-transparent hover:text-charcoal data-[state=open]:bg-transparent">
                    {cat.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul
                      className="w-[220px] p-2"
                      style={{
                        backgroundColor: "#FAF8F5",
                        border: "1px solid #e8e0d5",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                      }}
                    >
                      <li className="mb-2 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#8B6914]">
                        {cat.name}
                      </li>
                      {cat.subcategories.map((sub) => {
                        const href = sub.filter
                          ? `/collections/${cat.slug}?filter=${encodeURIComponent(sub.filter)}`
                          : `/collections/${cat.slug}`;
                        return (
                          <li key={sub.label}>
                            <SubcategoryLink href={href}>
                              {sub.label}
                            </SubcategoryLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <NavbarSearch />
          <div className="relative inline-block">
            <Link href="/account/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-charcoal"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            {wishlistCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs bg-walnut text-cream hover:bg-walnut/90">
                {wishlistCount}
              </Badge>
            )}
          </div>
          <div className="relative inline-block">
            <Link href={user ? "/account" : "/login"}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-charcoal"
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
              className="h-9 w-9 text-charcoal"
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
                className="h-9 w-9 md:hidden text-charcoal"
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
                {Object.entries(CATEGORY_DROPDOWNS).map(([slug, cat]) => (
                  <div key={slug}>
                    <SheetClose asChild>
                      <Link
                        href={`/collections/${slug}`}
                        className="font-medium text-charcoal hover:text-walnut"
                      >
                        {cat.name}
                      </Link>
                    </SheetClose>
                    <div className="ml-4 mt-1 flex flex-col gap-1">
                      {cat.subcategories.map((sub) => {
                        const href = sub.filter
                          ? `/collections/${slug}?filter=${encodeURIComponent(sub.filter)}`
                          : `/collections/${slug}`;
                        return (
                          <SheetClose asChild key={sub.label}>
                            <Link
                              href={href}
                              className="text-sm text-warm-gray hover:text-walnut"
                            >
                              {sub.label}
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
