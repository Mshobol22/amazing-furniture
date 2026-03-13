import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Financing",
  description:
    "Flexible financing options for your furniture purchase at Amazing Home Furniture.",
};

export default function FinancingPage() {
  return (
    <div className="min-h-screen noise-overlay page-financing px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-white/70">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white">Financing</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-white">
          Financing Options
        </h1>

        <div className="space-y-6 text-white/90">
          <p>
            Flexible payment options coming soon. Contact us for more information.
          </p>
          <Link href="/contact" className="text-[#8B6914] hover:underline">
            Contact us →
          </Link>
        </div>
      </div>
    </div>
  );
}
