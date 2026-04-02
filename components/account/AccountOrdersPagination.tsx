"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AccountOrdersPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = (page: number) => {
    const p = new URLSearchParams(searchParams.toString());
    if (page <= 1) p.delete("page");
    else p.set("page", String(page));
    const q = p.toString();
    router.push(q ? `/account/orders?${q}` : "/account/orders");
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 border-t border-light-sand px-6 py-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => go(currentPage - 1)}
        className="border-charcoal/20"
      >
        Previous
      </Button>
      <span className="text-sm text-warm-gray">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => go(currentPage + 1)}
        className="border-charcoal/20"
      >
        Next
      </Button>
    </div>
  );
}
