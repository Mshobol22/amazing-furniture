"use client";

import Link from "next/link";

export default function FinancingNoticeBar() {
  return (
    <section className="sticky top-14 z-40 border-b border-[#2D4A3E]/20 bg-[#FAF8F5] lg:top-24">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center">
        <Link
          href="/financing"
          className="font-sans text-sm font-semibold text-[#2D4A3E] underline-offset-4 hover:underline"
        >
          Flexible Financing Available - Apply with Koalafi or Synchrony
        </Link>
      </div>
    </section>
  );
}
