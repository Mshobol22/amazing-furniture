"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  User,
  ShoppingBag,
  Menu,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCartStore, useCartItemCount } from "@/store/cartStore";
import { useWishlistStore, useWishlistCount } from "@/store/wishlistStore";
import type { Product } from "@/types";

const CATEGORIES: Record<
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
    name: "TV Stands",
    slug: "tv-stand",
    subcategories: [{ label: "All TV Stands" }],
  },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Navbar() {
  const pathname = usePathname();
  const openCart = useCartStore((state) => state.openCart);
  const cartCount = useCartItemCount();
  const wishlistCount = useWishlistCount();
  const wishlistItems = useWishlistStore((state) => state.items);
  const hasWishlistItems = wishlistItems.length > 0;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownCloseTimer, setDropdownCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => setSearchResults(Array.isArray(data) ? data : []))
      .catch(() => setSearchResults([]))
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleDropdownEnter = (key: string) => {
    if (dropdownCloseTimer) {
      clearTimeout(dropdownCloseTimer);
      setDropdownCloseTimer(null);
    }
    setActiveDropdown(key);
  };

  const handleDropdownLeave = () => {
    const timer = setTimeout(() => setActiveDropdown(null), 150);
    setDropdownCloseTimer(timer);
  };

  const categoryLabel = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");

  const isCollectionActive = (slug: string) =>
    pathname.startsWith(`/collections/${slug}`);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#ede8e3] bg-[#FAF8F5]/90 backdrop-blur-md">
        {/* Row 1 */}
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex flex-shrink-0 items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex h-10 w-10 items-center justify-center text-[#1C1C1C] hover:bg-black/5 rounded"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>
            <Link
              href="/"
              className="font-display text-lg font-semibold whitespace-nowrap flex-shrink-0 text-[#1C1C1C]"
            >
              Amazing Home
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex p-1.5 items-center justify-center text-[#1C1C1C] hover:bg-black/5 rounded sm:p-2"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/account/wishlist"
              className="relative flex p-1.5 items-center justify-center text-[#1C1C1C] hover:bg-black/5 rounded sm:p-2"
              aria-label="Wishlist"
            >
              <Heart
                className={`h-5 w-5 ${hasWishlistItems ? "fill-red-500 text-red-500" : ""}`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 min-w-[16px] items-center justify-center rounded-full bg-[#8B6914] text-[10px] font-medium text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              href={user ? "/account" : "/login"}
              className="relative flex p-1.5 items-center justify-center text-[#1C1C1C] hover:bg-black/5 rounded sm:p-2"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
              {user && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-500" aria-hidden />
              )}
            </Link>
            <button
              onClick={openCart}
              className="relative flex p-1.5 items-center justify-center text-[#1C1C1C] hover:bg-black/5 rounded sm:p-2"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 min-w-[16px] items-center justify-center rounded-full bg-[#8B6914] text-[10px] font-medium text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div
            ref={searchContainerRef}
            className="border-b border-[#ede8e3] bg-[#FAF8F5] px-4 py-3"
          >
            <div className="relative mx-auto max-w-2xl">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setSearchOpen(false);
                    window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
                placeholder="Search products..."
                className="w-full border-0 bg-transparent py-2 pr-10 text-[#1C1C1C] placeholder:text-[#6B6560] outline-none"
              />
              {(searchQuery || searchResults.length > 0) && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-[#ede8e3] bg-white shadow-lg">
                  {isSearching ? (
                    <div className="p-4 text-sm text-[#6B6560]">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <ul className="py-2">
                      {searchResults.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/products/${p.slug}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between gap-4 px-4 py-2 hover:bg-gray-50"
                          >
                            <span className="font-medium text-[#1C1C1C]">{p.name}</span>
                            <span className="text-sm text-[#6B6560]">
                              ${p.price.toLocaleString()} · {categoryLabel(p.category)}
                            </span>
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                          onClick={() => setSearchOpen(false)}
                          className="block px-4 py-2 text-sm font-medium text-[#8B6914] hover:bg-gray-50"
                        >
                          View all results →
                        </Link>
                      </li>
                    </ul>
                  ) : (
                    debouncedQuery && (
                      <div className="p-4">
                        <p className="text-sm text-[#6B6560]">No products found</p>
                        <Link
                          href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                          onClick={() => setSearchOpen(false)}
                          className="mt-2 inline-block text-sm text-[#8B6914] hover:underline"
                        >
                          Search &quot;{debouncedQuery}&quot; →
                        </Link>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Row 2 - Desktop only, hidden on mobile */}
        <div className="hidden lg:flex overflow-hidden bg-white border-b border-[#ede8e3]">
          <div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-0 overflow-hidden px-4">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div
                key={key}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(key)}
                onMouseLeave={handleDropdownLeave}
              >
                <Link
                  href={`/collections/${cat.slug}`}
                  className={`block px-3 py-2 text-sm font-medium text-[#1C1C1C] cursor-pointer whitespace-nowrap ${
                    isCollectionActive(cat.slug)
                      ? "border-b-2 border-[#8B6914]"
                      : "hover:border-b-2 hover:border-[#8B6914]"
                  }`}
                >
                  {cat.name}
                </Link>
                {activeDropdown === key && (
                  <div
                    className="absolute left-0 top-full min-w-[200px] rounded-b-lg border border-[#ede8e3] bg-white p-5 shadow-lg z-50 animate-in fade-in-0 slide-in-from-top-1 duration-150"
                    style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
                    onMouseEnter={() => handleDropdownEnter(key)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {cat.subcategories.map((sub) => {
                      const href = sub.filter
                        ? `/collections/${cat.slug}?filter=${encodeURIComponent(sub.filter)}`
                        : `/collections/${cat.slug}`;
                      return (
                        <Link
                          key={sub.label}
                          href={href}
                          className="block py-1.5 text-sm text-[#1C1C1C] hover:text-[#8B6914] hover:underline"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile slide-out drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            className="fixed top-0 left-0 z-50 h-full w-[280px] bg-white shadow-xl"
            style={{
              animation: "slideIn 0.3s ease-out forwards",
            }}
          >
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
              }
              @keyframes slideOut {
                from { transform: translateX(0); }
                to { transform: translateX(-100%); }
              }
            `}</style>
            <div className="flex h-14 items-center justify-between border-b border-[#ede8e3] px-4">
              <Link
                href="/"
                className="font-display font-semibold text-[#1C1C1C]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Amazing Home
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-[#1C1C1C]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto py-4">
              <Link
                href="/collections/all"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 font-medium hover:bg-gray-50 ${
                  pathname === "/collections/all" ? "text-[#8B6914] font-semibold" : "text-[#1C1C1C]"
                }`}
              >
                Shop All
              </Link>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <div key={key} className="border-b border-[#ede8e3]/50">
                  <button
                    onClick={() =>
                      setExpandedMobileCategory(expandedMobileCategory === key ? null : key)
                    }
                    className={`flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-gray-50 ${
                      isCollectionActive(cat.slug) ? "text-[#8B6914] font-semibold" : "text-[#1C1C1C]"
                    }`}
                  >
                    {cat.name}
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        expandedMobileCategory === key ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {expandedMobileCategory === key && (
                    <div className="bg-gray-50/50 pb-2 pl-4">
                      {cat.subcategories.map((sub) => {
                        const href = sub.filter
                          ? `/collections/${cat.slug}?filter=${encodeURIComponent(sub.filter)}`
                          : `/collections/${cat.slug}`;
                        return (
                          <Link
                            key={sub.label}
                            href={href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setExpandedMobileCategory(null);
                            }}
                            className="block py-2 text-sm text-[#6B6560] hover:text-[#8B6914]"
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-4 border-t border-[#ede8e3] pt-4">
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-gray-50"
                >
                  My Account
                </Link>
                <Link
                  href="/account/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-gray-50"
                >
                  Wishlist
                </Link>
                <Link
                  href="/track-order"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-gray-50"
                >
                  Track Order
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-gray-50"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
