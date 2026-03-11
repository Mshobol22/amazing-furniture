"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) return;
    toast({
      title: "Thanks for subscribing!",
      description: "You'll hear from us soon.",
    });
    setEmail("");
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
            <form onSubmit={handleSubscribe} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border-white/20 bg-white/5 text-cream placeholder:text-cream/50 focus-visible:ring-walnut"
              />
              <Button
                type="submit"
                className="bg-walnut text-cream hover:bg-walnut/90"
              >
                Subscribe
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

            {/* Shop */}
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
                Shop
              </h4>
              <ul className="mt-4 space-y-2">
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

            {/* Support */}
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
                Support
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
                    Order Tracking
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
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
