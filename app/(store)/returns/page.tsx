import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ReturnsPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
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
              30-Day Return Policy
            </h2>
            <p>
              We offer a 30-day return policy from the date of delivery. If
              you&apos;re not satisfied with your purchase, you may return it
              for a full refund.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Return Conditions
            </h2>
            <p>
              Items must be in original condition and packaging. Furniture that
              has been assembled, used, or damaged may not be eligible for
              return.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Return Shipping
            </h2>
            <p>
              The customer is responsible for return shipping costs. We
              recommend using a trackable shipping service and retaining your
              receipt.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Refunds
            </h2>
            <p>
              Refunds are processed within 5–7 business days after we receive
              your return. The refund will be credited to your original payment
              method.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Damaged Items
            </h2>
            <p>
              If your item arrives damaged, please contact us within 48 hours of
              delivery with photos of the damage. We&apos;ll arrange a
              replacement or refund.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Final Sale
            </h2>
            <p>
              Custom orders and clearance items are final sale and cannot be
              returned.
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
