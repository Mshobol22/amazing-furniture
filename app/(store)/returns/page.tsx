import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Sales & Return Policy",
  description:
    "Sales and return policy at Amazing Home Furniture. All sales are final after delivery and installation.",
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
          <span className="text-charcoal">Sales & Return Policy</span>
        </nav>

        <h1 className="mb-8 text-3xl font-semibold text-charcoal">
          Sales & Return Policy
        </h1>

        <div className="prose prose-charcoal max-w-none space-y-6 text-warm-gray">
          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              All Sales Final
            </h2>
            <p>
              All purchases are final. We do not accept returns or exchanges
              after delivery and installation. Please review all product details
              carefully before completing your purchase.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Damaged or Defective Items
            </h2>
            <p>
              If your item arrives damaged or defective, you must contact us
              within 48 hours of delivery with:
            </p>
            <ul className="mt-3 list-disc pl-6">
              <li>Clear photographic evidence of the damage</li>
              <li>Your order number</li>
              <li>A description of the issue</li>
            </ul>
            <p className="mt-3">
              Claims submitted after 48 hours cannot be accepted.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Delivery
            </h2>
            <p>
              We offer free shipping on all orders over $299. Our team will
              contact you to schedule delivery after your order is confirmed.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Financing
            </h2>
            <p>
              We partner with Synchrony and Koalafi to offer flexible financing
              options. Contact us for details.
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
