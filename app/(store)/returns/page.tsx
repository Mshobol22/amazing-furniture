import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Returns Policy",
  description:
    "30-day hassle-free returns at Amazing Home Furniture. Full policy details.",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Returns</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Returns Policy
        </h1>

        <div className="prose prose-charcoal max-w-none space-y-6 text-warm-gray">
          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              30-Day Return Window
            </h2>
            <p>
              30-day return window from delivery date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Return Conditions
            </h2>
            <p>
              Items must be unused, unassembled, in original packaging.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Return Shipping
            </h2>
            <p>
              Customer responsible for return shipping costs.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Refunds
            </h2>
            <p>
              Refund processed within 5–7 business days after we receive the
              item.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Damaged on Arrival
            </h2>
            <p>
              Contact within 48 hours with photos — we&apos;ll replace at no cost.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Final Sale
            </h2>
            <p>
              Clearance and custom items are final sale.
            </p>
          </section>

          <p className="mt-8">
            Questions?{" "}
            <Link href="/contact" className="text-walnut hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
