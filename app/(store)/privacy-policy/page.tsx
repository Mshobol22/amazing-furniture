import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Amazing Home Furniture collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className=" text-4xl font-semibold text-charcoal">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-warm-gray">Last updated: March 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-charcoal/80">

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              1. Who We Are
            </h2>
            <p className="mt-3">
              Amazing Home Furniture (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website{" "}
              <span className="text-charcoal">amazinghomefurniturestore.com</span>.
              We are committed to protecting your personal information and being
              transparent about how we use it. Questions about this policy can
              be sent to{" "}
              <a
                href="mailto:amazinghome80@gmail.com"
                className="text-walnut underline hover:text-walnut/80"
              >
                amazinghome80@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              2. Information We Collect
            </h2>
            <p className="mt-3">
              We collect information you provide directly to us when you create
              an account, place an order, or contact us:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                <strong>Identity data:</strong> full name, email address
              </li>
              <li>
                <strong>Shipping data:</strong> delivery address, city, state,
                ZIP code, country
              </li>
              <li>
                <strong>Payment data:</strong> your payment is processed
                entirely by Stripe. We never see, store, or have access to your
                card number, CVV, or full card details. Stripe may store a
                payment method reference on our behalf.
              </li>
              <li>
                <strong>Order data:</strong> items purchased, quantities,
                prices, order status, and transaction identifiers
              </li>
              <li>
                <strong>Account data:</strong> password (stored as a secure
                hash — never in plain text), account preferences
              </li>
            </ul>
            <p className="mt-3">
              We also collect limited technical data automatically when you
              visit our site, including your IP address, browser type, pages
              visited, and referring URL. This data is used solely to improve
              site performance and security.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              3. How We Use Your Information
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                <strong>Order fulfillment:</strong> processing payments,
                arranging delivery, and providing order confirmation and
                tracking updates
              </li>
              <li>
                <strong>Transactional email:</strong> order confirmations,
                shipping notifications, and responses to your support requests.
                We do not send marketing emails without your separate opt-in
                consent.
              </li>
              <li>
                <strong>Account management:</strong> authenticating your
                account and maintaining your order history
              </li>
              <li>
                <strong>Site improvement:</strong> analysing aggregate usage
                patterns to improve performance, navigation, and the shopping
                experience
              </li>
              <li>
                <strong>Legal compliance:</strong> retaining order and financial
                records as required by law
              </li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or trade your personal information to any
              third party for their own marketing purposes.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              4. Cookies
            </h2>
            <p className="mt-3">
              Our site uses two categories of cookies:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Essential cookies:</strong> required for the site to
                function. These include authentication session cookies (so you
                stay logged in) and cart cookies (so your selected items
                persist). These are set regardless of your consent choice and
                cannot be disabled without breaking core functionality.
              </li>
              <li>
                <strong>Analytics cookies:</strong> used to understand how
                visitors interact with our site in aggregate. These are only
                loaded if you choose &ldquo;Accept All&rdquo; in our cookie banner. You can
                withdraw this consent at any time by clearing your browser
                storage.
              </li>
            </ul>
            <p className="mt-3">
              Your cookie preference is stored locally in your browser. We do
              not transmit your consent choice to any server.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              5. Third-Party Services
            </h2>
            <p className="mt-3">
              We use the following third-party services to operate our store.
              Each service has its own privacy policy governing its use of data:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Stripe</strong> — payment processing. Stripe handles
                all card data under PCI-DSS compliance. We receive only a
                payment confirmation and a transaction ID.
              </li>
              <li>
                <strong>Supabase</strong> — our database and authentication
                provider. Your account and order data is stored in a Supabase
                PostgreSQL database hosted in the United States.
              </li>
              <li>
                <strong>Vercel</strong> — our hosting provider. Your requests
                to our site are served through Vercel&apos;s global edge network.
                Vercel may log request metadata (IP address, path) for
                security and performance purposes.
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery. Your
                name and email address are passed to Resend solely to deliver
                order confirmation emails on our behalf.
              </li>
            </ul>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              6. Data Retention
            </h2>
            <p className="mt-3">
              We retain order records, including your name, email, shipping
              address, and purchase details, for a minimum of 7 years to comply
              with financial record-keeping and tax obligations. Account data is
              retained for as long as your account is active. You may request
              deletion of your account at any time; where we are not legally
              required to retain the data, we will delete it within 30 days.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              7. Your Rights
            </h2>
            <p className="mt-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>
                Request deletion of your data (subject to legal retention
                requirements)
              </li>
              <li>Object to certain uses of your data</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a
                href="mailto:amazinghome80@gmail.com"
                className="text-walnut underline hover:text-walnut/80"
              >
                amazinghome80@gmail.com
              </a>{" "}
              with your request and we will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              8. Security
            </h2>
            <p className="mt-3">
              We take reasonable technical and organisational measures to
              protect your information, including encrypted connections (HTTPS),
              server-side authentication, and access controls on our database.
              No method of transmission over the internet is 100% secure;
              however, we take all commercially practicable steps to protect
              your data.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              9. Changes to This Policy
            </h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. When we do,
              we will update the &ldquo;Last updated&rdquo; date at the top of this page. We
              encourage you to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className=" text-xl font-semibold text-charcoal">
              10. Contact Us
            </h2>
            <p className="mt-3">
              For any privacy-related questions or requests:
            </p>
            <p className="mt-2">
              Amazing Home Furniture
              <br />
              Email:{" "}
              <a
                href="mailto:amazinghome80@gmail.com"
                className="text-walnut underline hover:text-walnut/80"
              >
                amazinghome80@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
