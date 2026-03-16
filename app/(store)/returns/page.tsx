import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Returns Policy",
  description:
    "Returns and exchange policy at Amazing Home Furniture. Contact us for assistance.",
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
              Our Policy
            </h2>
            <p>
              We want you to love your furniture. If you have any concerns with
              your order, please contact our team and we&apos;ll work with you
              to make it right.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Return Conditions
            </h2>
            <p>
              Items eligible for return must be unused, unassembled, and in
              original packaging. Clearance and custom items are final sale.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Damaged on Arrival
            </h2>
            <p>
              Contact us within 48 hours of delivery with photos — we&apos;ll
              replace or refund at no cost to you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              2-Year Manufacturer Warranty
            </h2>
            <p>
              All products are covered by a 2-year manufacturer warranty against
              defects in materials and workmanship.
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
