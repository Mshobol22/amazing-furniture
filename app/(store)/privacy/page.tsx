import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for Amazing Home Furniture — how we collect, use and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">Privacy Policy</span>
        </nav>

        <h1 className="mb-8 text-3xl font-semibold text-charcoal">
          Privacy Policy
        </h1>

        <div className="prose prose-charcoal max-w-none space-y-6 text-warm-gray">
          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Information We Collect
            </h2>
            <p>
              Name, email, address, payment via Stripe.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              How We Use It
            </h2>
            <p>
              Order fulfillment, account management, marketing with consent.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Third Parties
            </h2>
            <p>
              Stripe, shipping carriers.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Cookies
            </h2>
            <p>
              Cart persistence, site preferences.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Your Rights
            </h2>
            <p>
              Contact us to delete data.
            </p>
          </section>

          <section>
            <h2 className=" text-lg font-semibold text-charcoal">
              Contact
            </h2>
            <p>
              For privacy-related questions, contact us at{" "}
              <a
                href="mailto:amazinghome80@gmail.com"
                className="text-walnut hover:underline"
              >
                amazinghome80@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
