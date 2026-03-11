import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Privacy Policy</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Privacy Policy
        </h1>

        <div className="prose prose-charcoal max-w-none space-y-6 text-warm-gray">
          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Information We Collect
            </h2>
            <p>
              We collect information you provide when placing an order or
              creating an account: your name, email address, shipping address,
              and payment information. Payment details are processed securely by
              Stripe—we do not store your full credit card number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              How We Use Your Information
            </h2>
            <p>
              We use your information to fulfill orders, manage your account,
              send order confirmations and shipping updates, and improve our
              services. We may also send promotional emails if you&apos;ve opted
              in.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Third Parties
            </h2>
            <p>
              We share information with trusted partners: Stripe for payment
              processing and shipping carriers for delivery. These parties are
              required to protect your information and use it only for the
              purposes we specify.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Cookies
            </h2>
            <p>
              We use cookies for site preferences, cart persistence, and
              analytics. You can disable cookies in your browser settings, though
              some features may not work correctly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Contact
            </h2>
            <p>
              For privacy-related questions, contact us at{" "}
              <a
                href="mailto:support@amazinghomefurniture.com"
                className="text-walnut hover:underline"
              >
                support@amazinghomefurniture.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
