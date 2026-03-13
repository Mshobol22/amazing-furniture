import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Shipping Policy",
  description:
    "Free shipping on orders over $299. Standard 5–10 business days. Ships to the contiguous United States.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen noise-overlay page-policy px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Shipping</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Shipping Policy
        </h1>

        <div className="prose prose-charcoal max-w-none space-y-6 text-warm-gray">
          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Free Shipping
            </h2>
            <p>
              Orders over $299 ship free (standard).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Standard Shipping
            </h2>
            <p>5–10 business days</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Express Shipping
            </h2>
            <p>2–5 business days (additional fee at checkout)</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Delivery Area
            </h2>
            <p>Contiguous 48 United States only</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Delivery Options
            </h2>
            <p>
              Curbside delivery standard. White-glove (room of choice +
              packaging removal) available.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Tracking
            </h2>
            <p>
              You&apos;ll receive tracking info via email once shipped.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
