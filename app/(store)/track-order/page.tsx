"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - no backend yet
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

        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <Label htmlFor="orderNumber">Order Number</Label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ORD-12345"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email used for order"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="bg-walnut text-cream hover:bg-walnut/90">
            Track Order
          </Button>
        </form>

        <div className="mt-8 rounded-lg border border-gray-200 bg-cream/50 p-6">
          <p className="text-sm text-warm-gray">
            Order tracking is being set up. Please contact{" "}
            <a
              href="mailto:support@amazinghomefurniture.com"
              className="text-walnut hover:underline"
            >
              support@amazinghomefurniture.com
            </a>{" "}
            with your order number for status updates.
          </p>
        </div>
      </div>
    </div>
  );
}
