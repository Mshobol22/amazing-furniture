"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { name: "Beds & Bedroom", slug: "bed" },
  { name: "Chairs & Recliners", slug: "chair" },
  { name: "Sofas & Sectionals", slug: "sofa" },
  { name: "Dining & Tables", slug: "table" },
  { name: "Dressers & Cabinets", slug: "cabinet" },
  { name: "TV Stands & Entertainment", slug: "tv-stand" },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Footer() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSuccess(true);
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <footer className="bg-charcoal text-cream">
      {/* Newsletter */}
      <div className="border-b border-white/10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:gap-8">
            <div>
              <h3 className="font-display text-2xl font-semibold">
                Stay in the loop
              </h3>
              <p className="mt-1 text-sm text-cream/80">
                Get exclusive offers and design inspiration.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-start"
            >
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="border-white/20 bg-white/5 text-cream placeholder:text-cream/50 focus-visible:ring-walnut"
                />
                {error && (
                  <p className="mt-1 text-sm text-red-400">{error}</p>
                )}
                {success && (
                  <p className="mt-1 text-sm text-green-400">
                    You&apos;re on the list! Expect exclusive deals soon.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-walnut text-cream hover:bg-walnut/90 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Link href="/" className="font-display text-xl font-semibold">
                Amazing Home Furniture
              </Link>
              <p className="mt-3 text-sm text-cream/80">
                Handcrafted furniture for the modern home. Elevate your living
                space with timeless design.
              </p>
              <p className="mt-2 text-sm font-medium text-walnut">
                Free shipping over $299
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
                Quick Links
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/collections/all"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Shop All
                  </Link>
                </li>
                <li>
                  <Link
                    href="/financing"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Financing
                  </Link>
                </li>
                {CATEGORIES.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/collections/${cat.slug}`}
                      className="text-sm text-cream/80 transition-colors hover:text-cream"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
                Customer Service
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/faq"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/track-order"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social & Policies */}
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
                Follow Us
              </h4>
              <div className="mt-4 flex gap-3">
                <a
                  href="#"
                  className="text-cream/80 transition-colors hover:text-cream"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-cream/80 transition-colors hover:text-cream"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-cream/80 transition-colors hover:text-cream"
                  aria-label="Pinterest"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                  </svg>
                </a>
              </div>
              <h4 className="mt-6 font-display text-sm font-semibold uppercase tracking-wider">
                Policies
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/shipping"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Shipping
                  </Link>
                </li>
                <li>
                  <Link
                    href="/returns"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Returns
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-cream/60">
            © {new Date().getFullYear()} Amazing Home Furniture. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm text-cream/60">
              <CreditCard className="h-4 w-4" />
              Visa · Mastercard
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-cream/80">
              Stripe
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
