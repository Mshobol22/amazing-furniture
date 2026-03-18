"use client";

import { Toaster } from "@/components/ui/toaster";
import CookieConsent from "@/components/CookieConsent";
import CartMergeProvider from "@/components/cart/CartMergeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartMergeProvider>
      {children}
      <Toaster />
      <CookieConsent />
    </CartMergeProvider>
  );
}
