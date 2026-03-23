"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  User,
  ShoppingBag,
  Menu,
  Search,
  X,
  ChevronRight,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCartStore, useCartItemCount } from "@/store/cartStore";
import { useWishlistStore, useWishlistCount } from "@/store/wishlistStore";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  onSale?: boolean;
  image: string | null;
  category: string;
}

const CATEGORIES: Record<
  string,
  { name: string; slug: string; subcategories: { label: string; href?: string; dividerTop?: boolean }[] }
> = {
  bed: {
    name: "Beds",
    slug: "bed",
    subcategories: [
      { label: "Beds", href: "/collections/bed?type=Beds" },
      { label: "Bunk Beds", href: "/collections/bed?type=Bunk+Beds" },
      { label: "Daybeds", href: "/collections/bed?type=Daybeds" },
      { label: "Storage Beds", href: "/collections/bed?type=Storage+Beds" },
      { label: "All Beds", href: "/collections/bed", dividerTop: true },
    ],
  },
  "bedroom-furniture": {
    name: "Bedroom Furniture",
    slug: "bedroom-furniture",
    subcategories: [
      { label: "Bedroom Sets", href: "/collections/bedroom-furniture?type=Bedroom+Sets" },
      { label: "Dressers", href: "/collections/bedroom-furniture?type=Dressers" },
      { label: "Nightstands", href: "/collections/bedroom-furniture?type=Nightstands" },
      { label: "Chests", href: "/collections/bedroom-furniture?type=Chests" },
      { label: "Mirrors", href: "/collections/bedroom-furniture?type=Mirrors" },
      { label: "Vanities", href: "/collections/bedroom-furniture?type=Vanities" },
      { label: "All Bedroom Furniture", href: "/collections/bedroom-furniture", dividerTop: true },
    ],
  },
  sofa: {
    name: "Sofas & Sectionals",
    slug: "sofa",
    subcategories: [
      { label: "Sofas", href: "/collections/sofa?type=Sofas" },
      { label: "Sectionals", href: "/collections/sofa?type=Sectionals" },
      { label: "Loveseats", href: "/collections/sofa?type=Loveseats" },
      { label: "Reclining Sofas", href: "/collections/sofa?type=Reclining+Sofas" },
      { label: "All Sofas", href: "/collections/sofa", dividerTop: true },
    ],
  },
  chair: {
    name: "Chairs & Recliners",
    slug: "chair",
    subcategories: [
      { label: "Accent Chairs", href: "/collections/chair?type=Accent+Chairs" },
      { label: "Dining Chairs", href: "/collections/chair?type=Dining+Chairs" },
      { label: "Recliners", href: "/collections/chair?type=Recliners" },
      { label: "Bar Stools", href: "/collections/chair?type=Bar+Stools" },
      { label: "All Chairs", href: "/collections/chair", dividerTop: true },
    ],
  },
  table: {
    name: "Dining & Tables",
    slug: "table",
    subcategories: [
      { label: "Dining Tables", href: "/collections/table?type=Dining+Tables" },
      { label: "Coffee Tables", href: "/collections/table?type=Coffee+Tables" },
      { label: "Accent & End Tables", href: "/collections/table?type=Accent+%26+End+Tables" },
      { label: "Bar & Pub Tables", href: "/collections/table?type=Bar+%26+Pub+Tables" },
      { label: "All Tables", href: "/collections/table", dividerTop: true },
    ],
  },
  cabinet: {
    name: "Cabinets & Storage",
    slug: "cabinet",
    subcategories: [
      { label: "Cabinets & Storage", href: "/collections/cabinet?type=Cabinets+%26+Storage" },
      { label: "Buffets & Servers", href: "/collections/cabinet?type=Buffets+%26+Servers" },
      { label: "Bookcases", href: "/collections/cabinet?type=Bookcases" },
      { label: "All Cabinets", href: "/collections/cabinet", dividerTop: true },
    ],
  },
  "tv-stand": {
    name: "TV Stands",
    slug: "tv-stand",
    subcategories: [
      { label: "TV Stands", href: "/collections/tv-stand?type=TV+Stands" },
      { label: "Entertainment Centers", href: "/collections/tv-stand?type=Entertainment+Centers" },
      { label: "TV Stands with Fireplace", href: "/collections/tv-stand?type=TV+Stands+with+Fireplace" },
      { label: "All TV Stands", href: "/collections/tv-stand", dividerTop: true },
    ],
  },
  rug: {
    name: "Rugs",
    slug: "rug",
    subcategories: [
      { label: "Area Rugs", href: "/collections/rug?type=Area+Rugs" },
      { label: "Shag Rugs", href: "/collections/rug?type=Shag+Rugs" },
      { label: "Runners", href: "/collections/rug?type=Runners" },
      { label: "Round Rugs", href: "/collections/rug?type=Round+Rugs" },
      { label: "Large Rugs", href: "/collections/rug?type=Large+Rugs" },
      { label: "Bohemian & Tribal", href: "/collections/rug?type=Bohemian+%26+Tribal" },
      { label: "All Rugs", href: "/collections/rug", dividerTop: true },
    ],
  },
  other: {
    name: "More Furniture",
    slug: "other",
    subcategories: [
      { label: "Benches", href: "/collections/other?type=Benches" },
      { label: "Desks", href: "/collections/other?type=Desks" },
      { label: "Ottomans", href: "/collections/other?type=Ottomans" },
      { label: "All More Furniture", href: "/collections/other", dividerTop: true },
    ],
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
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
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`)
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

  const isHomepage = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      // Hide on scroll down, show on scroll up (desktop only)
      if (y > 120 && y > lastScrollY.current) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navTransparent = isHomepage && !scrolled;
  const iconColor = "text-cream";
  const logoColor = "text-cream";
  const iconHover = "hover:bg-white/10";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } ${
          navTransparent
            ? "border-b border-[#2D4A3E]/20 bg-[#2D4A3E]/80 backdrop-blur-md"
            : "border-b border-[#2D4A3E]/20 bg-[#2D4A3E]/95 shadow-sm backdrop-blur-md"
        }`}
      >
        {/* Row 1 */}
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex flex-shrink-0 items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`lg:hidden flex h-10 w-10 items-center justify-center rounded ${iconColor} ${iconHover}`}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>
            <Link
              href="/"
              className={`font-display text-lg font-semibold whitespace-nowrap flex-shrink-0 ${logoColor}`}
            >
              Amazing Home
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sale"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold tracking-wide text-red-500 hover:text-red-400 transition-colors whitespace-nowrap"
            >
              <Tag className="h-4 w-4" />
              Sale
            </Link>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`flex p-1.5 items-center justify-center rounded sm:p-2 ${iconColor} ${iconHover}`}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/account/wishlist"
              className={`relative flex p-1.5 items-center justify-center rounded sm:p-2 ${iconColor} ${iconHover}`}
              aria-label="Wishlist"
            >
              <Heart
                className={`h-5 w-5 ${hasWishlistItems ? "fill-red-500 text-red-500" : ""}`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 min-w-[16px] items-center justify-center rounded-full bg-[#2D4A3E] text-[10px] font-medium text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              href={user ? "/account" : "/login"}
              className={`relative flex p-1.5 items-center justify-center rounded sm:p-2 ${iconColor} ${iconHover}`}
              aria-label="Account"
            >
              <User className="h-5 w-5" />
              {user && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-500" aria-hidden />
              )}
            </Link>
            <button
              onClick={openCart}
              className={`relative flex p-1.5 items-center justify-center rounded sm:p-2 ${iconColor} ${iconHover}`}
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 min-w-[16px] items-center justify-center rounded-full bg-[#2D4A3E] text-[10px] font-medium text-white">
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
            className="relative z-[9999] border-b border-[#1C1C1C]/20 bg-white/95 px-4 py-3 backdrop-blur-sm"
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
                <div className="absolute left-0 top-full z-[9999] mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-[#ede8e3] bg-white shadow-lg">
                  {isSearching ? (
                    <div className="p-4 text-sm text-[#6B6560]">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="py-2">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setSearchOpen(false);
                              router.push(`/products/${result.slug}`);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#FAF8F5] transition-colors text-left group"
                          >
                            {result.image ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                                <img
                                  src={result.image}
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1C1C1C] line-clamp-1 group-hover:text-[#2D4A3E] transition-colors">
                                {result.name}
                              </p>
                              <p className="text-xs text-gray-400 capitalize">
                                {result.category.replace("-", " ")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-[#1C1C1C]">
                                ${result.price.toLocaleString()}
                              </p>
                              {result.onSale && result.originalPrice != null && (
                                <p className="text-xs text-red-500 line-through">
                                  ${result.originalPrice.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      {searchResults.length >= 5 && (
                        <div className="border-t border-gray-100 px-4 py-2">
                          <button
                            onClick={() => {
                              setSearchOpen(false);
                              router.push(
                                `/collections/all?search=${encodeURIComponent(searchQuery.trim())}`
                              );
                            }}
                            className="text-xs text-[#2D4A3E] font-medium hover:underline w-full text-center py-1"
                          >
                            View all results for &quot;{searchQuery}&quot; →
                          </button>
                        </div>
                      )}
                    </>
                  ) : searchQuery.length >= 2 && !isSearching ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      No products found for &quot;{searchQuery}&quot;
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Row 2 - Desktop only, hidden on mobile */}
        <div
          className={`hidden border-b lg:flex ${
            navTransparent ? "border-[#2D4A3E]/20 bg-[#1E3329]/80" : "border-[#2D4A3E]/30 bg-[#1E3329]"
          }`}
        >
          <div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-0 px-4">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div
                key={key}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(key)}
                onMouseLeave={handleDropdownLeave}
              >
                <Link
                  href={`/collections/${cat.slug}`}
                  className={`block px-3 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap ${
                    navTransparent ? "text-white/90 hover:text-white" : "text-cream/90 hover:text-cream"
                  } ${
                    isCollectionActive(cat.slug)
                      ? "border-b-2 border-cream"
                      : "hover:border-b-2 hover:border-cream/60"
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
                      const href = sub.href ?? `/collections/${cat.slug}`;
                      return (
                        <Link
                          key={sub.label}
                          href={href}
                          className={`block py-1.5 text-sm text-[#1C1C1C] hover:text-[#2D4A3E] hover:underline ${
                            sub.dividerTop ? "mt-2 border-t border-[#ede8e3] pt-3" : ""
                          }`}
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
                  pathname === "/collections/all" ? "text-[#2D4A3E] font-semibold" : "text-[#1C1C1C]"
                }`}
              >
                Shop All
              </Link>
              <Link
                href="/sale"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 font-semibold text-red-500 hover:bg-gray-50"
              >
                <Tag className="h-4 w-4" />
                Sale
              </Link>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <div key={key} className="border-b border-[#ede8e3]/50">
                  <button
                    onClick={() =>
                      setExpandedMobileCategory(expandedMobileCategory === key ? null : key)
                    }
                    className={`flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-gray-50 ${
                      isCollectionActive(cat.slug) ? "text-[#2D4A3E] font-semibold" : "text-[#1C1C1C]"
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
                        const href = sub.href ?? `/collections/${cat.slug}`;
                        return (
                          <Link
                            key={sub.label}
                            href={href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setExpandedMobileCategory(null);
                            }}
                            className={`block py-2 text-sm text-[#6B6560] hover:text-[#2D4A3E] ${
                              sub.dividerTop ? "mt-2 border-t border-[#ede8e3] pt-3" : ""
                            }`}
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
