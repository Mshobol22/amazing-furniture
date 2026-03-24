import Link from "next/link";
import { ChevronRight } from "lucide-react";
import WishlistContent from "@/components/account/WishlistContent";

export default function WishlistPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Wishlist</span>
        </nav>

        <h1 className="mb-8 text-3xl font-semibold text-charcoal">
          Your Wishlist
        </h1>

        <WishlistContent />
      </div>
    </div>
  );
}
