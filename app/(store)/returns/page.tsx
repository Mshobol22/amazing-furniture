import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Sales Policy",
  description:
    "Sales policy at Amazing Home Furniture. All sales are final.",
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
          <span className="text-charcoal">Sales Policy</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Sales Policy
        </h1>

        <div className="prose prose-charcoal max-w-none space-y-6 text-warm-gray">
          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              All Sales Are Final
            </h2>
            <p>
              All purchases made at Amazing Home Furniture are final. We do not
              accept returns, exchanges, or cancellations once an order has been
              placed and confirmed. Please review your order carefully before
              completing your purchase.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Damaged or Defective Items
            </h2>
            <p>
              If your item arrives damaged or with a manufacturing defect,
              contact us within 48 hours of delivery with clear photos of the
              damage. We will assess the claim and, at our sole discretion,
              arrange a replacement or store credit for verified manufacturing
              defects only.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Order Cancellations
            </h2>
            <p>
              Orders cannot be cancelled once submitted. If you have entered
              incorrect shipping information, contact us immediately and we will
              do our best to assist before the order ships.
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
