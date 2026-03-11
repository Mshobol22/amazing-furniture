import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ShippingPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
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
              Enjoy free standard shipping on all orders over $299. Orders under
              $299 have a flat $29 shipping fee.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Shipping Times
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Standard shipping:</strong> 5–10 business days
              </li>
              <li>
                <strong>Express shipping:</strong> 2–5 business days (additional
                fee applies)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Delivery Area
            </h2>
            <p>
              We ship to the contiguous United States. Alaska, Hawaii, and
              international shipping may be available—contact us for details.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Delivery Options
            </h2>
            <p>
              Furniture is delivered curbside. White-glove delivery (in-home
              delivery and assembly) is available for select items for an
              additional fee.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Tracking
            </h2>
            <p>
              Once your order ships, you&apos;ll receive tracking information via
              email. You can also track your order on our{" "}
              <Link href="/track-order" className="text-walnut hover:underline">
                Order Tracking
              </Link>{" "}
              page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
