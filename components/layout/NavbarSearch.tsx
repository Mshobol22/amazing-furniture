"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format-price";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function NavbarSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => setResults(data))
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const categoryLabel = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");

  return (
    <div ref={containerRef} className="relative">
      {isOpen ? (
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  e.preventDefault();
                  setIsOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }
              }}
              placeholder="Search products..."
              className="h-9 w-48 rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-charcoal outline-none placeholder:text-warm-gray focus:ring-2 focus:ring-walnut/50 sm:w-64"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-gray hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {(query || results.length > 0) && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 min-w-[16rem] max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg sm:w-72">
              {isSearching ? (
                <div className="p-4 text-sm text-warm-gray">Searching...</div>
              ) : results.length > 0 ? (
                <ul className="py-2">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between gap-4 px-4 py-2 hover:bg-gray-50"
                      >
                        <span className="font-medium text-charcoal">
                          {product.name}
                        </span>
                        <span className="text-sm text-warm-gray">
                          {formatPrice(product.price)} ·{" "}
                          {categoryLabel(product.category)}
                        </span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href={`/search?q=${encodeURIComponent(query.trim())}`}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 text-sm text-walnut hover:bg-gray-50 font-medium"
                    >
                      View all results →
                    </Link>
                  </li>
                </ul>
              ) : (
                debouncedQuery && (
                  <div className="p-4">
                    <p className="text-sm text-warm-gray">No products found</p>
                    <Link
                      href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                      onClick={() => setIsOpen(false)}
                      className="mt-2 inline-block text-sm text-walnut hover:underline"
                    >
                      Search &quot;{debouncedQuery}&quot; →
                    </Link>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-9 w-9 items-center justify-center text-charcoal hover:bg-gray-100 rounded-md"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
