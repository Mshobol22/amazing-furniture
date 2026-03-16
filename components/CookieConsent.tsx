"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie_consent");
    if (!stored) setVisible(true);
  }, []);

  const accept = (type: "accepted" | "essential") => {
    localStorage.setItem("cookie_consent", type);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-light-sand bg-cream px-4 py-4 shadow-lg sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-warm-gray">
          We use cookies to improve your experience. By continuing, you agree to
          our{" "}
          <Link
            href="/privacy-policy"
            className="text-walnut underline hover:text-walnut/80"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => accept("essential")}
            className="rounded border border-charcoal/20 px-4 py-2 text-sm text-charcoal transition-colors hover:bg-light-sand"
          >
            Essential Only
          </button>
          <button
            onClick={() => accept("accepted")}
            className="rounded bg-walnut px-4 py-2 text-sm text-cream transition-colors hover:bg-walnut/90"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
