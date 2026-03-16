"use client";

import { Toaster } from "@/components/ui/toaster";
import CookieConsent from "@/components/CookieConsent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
      <CookieConsent />
    </>
  );
}
