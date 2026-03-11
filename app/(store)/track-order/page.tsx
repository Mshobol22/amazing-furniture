"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrackOrderPage() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Track Order</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Track Your Order
        </h1>

        <form onSubmit={handleTrack} className="flex flex-col items-center gap-4">
          <div className="w-full">
            <Label htmlFor="search">Order number or email</Label>
            <Input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number or email"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto bg-walnut text-cream hover:bg-walnut/90">
            Track Order
          </Button>
        </form>

        {submitted && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-cream/50 p-6 text-center">
            <p className="text-sm text-warm-gray">
              Order tracking is coming soon. For immediate help, email{" "}
              <a
                href="mailto:support@amazinghomefurniture.com"
                className="text-walnut hover:underline"
              >
                support@amazinghomefurniture.com
              </a>{" "}
              with your order number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
