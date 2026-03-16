import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for purchasing from Amazing Home Furniture.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-charcoal">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-warm-gray">Last updated: March 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-charcoal/80">

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3">
              By accessing or using the Amazing Home Furniture website at{" "}
              <span className="text-charcoal">amazinghomefurniturestore.com</span>{" "}
              (the &ldquo;Site&rdquo;) or placing an order, you agree to be bound by these
              Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms,
              please do not use our Site or services. We reserve the right to
              update these Terms at any time; continued use of the Site
              following any changes constitutes your acceptance of the revised
              Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              2. Products and Pricing
            </h2>
            <p className="mt-3">
              We make every effort to display our products accurately, including
              descriptions, dimensions, materials, and imagery. However:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                Product images are illustrative. Actual colours may vary
                slightly depending on your screen calibration and room lighting.
              </li>
              <li>
                Prices are displayed in US dollars and are subject to change
                without notice. The price charged is the price shown at the time
                you complete your order.
              </li>
              <li>
                We reserve the right to correct pricing errors and to cancel
                orders placed at an incorrect price. In such cases, we will
                contact you before processing payment.
              </li>
              <li>
                Free shipping applies to orders of $299 or more before taxes.
                Orders below this threshold incur a flat shipping fee displayed
                at checkout.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              3. Order Process and Acceptance
            </h2>
            <p className="mt-3">
              Placing an order on our Site constitutes an offer to purchase the
              selected products. Your order is not accepted until you receive an
              order confirmation email from us. The order confirmation email
              represents our acceptance of your order and forms a binding
              contract between you and Amazing Home Furniture.
            </p>
            <p className="mt-3">
              We reserve the right to refuse or cancel any order at our
              discretion, including but not limited to cases of suspected fraud,
              product unavailability, or pricing errors. If we cancel your order
              after payment has been collected, we will issue a full refund to
              your original payment method.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              4. Payment
            </h2>
            <p className="mt-3">
              All payments are processed securely by Stripe. We accept major
              credit and debit cards including Visa and Mastercard. By providing
              payment information, you represent that you are authorised to use
              the payment method provided. Payment is charged in full at the
              time of order placement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              5. Shipping and Delivery
            </h2>
            <p className="mt-3">
              We deliver to addresses within the contiguous United States.
              Standard delivery takes <strong>5–7 business days</strong> from
              the date your order is confirmed. Delivery times are estimates and
              not guaranteed; we are not liable for delays caused by carriers,
              weather, or circumstances beyond our control.
            </p>
            <p className="mt-3">
              You will receive a shipping confirmation email with tracking
              information once your order has been dispatched. Risk of loss and
              title for products pass to you upon delivery to the shipping
              address provided.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              6. Returns and Refunds
            </h2>
            <p className="mt-3">
              We want you to be fully satisfied with your purchase. To be
              eligible for a return, items must be unused, unassembled, and in
              their original packaging.
            </p>
            <p className="mt-3">
              To initiate a return, contact us at{" "}
              <a
                href="mailto:support@amazinghomefurniturestore.com"
                className="text-walnut underline hover:text-walnut/80"
              >
                support@amazinghomefurniturestore.com
              </a>{" "}
              with your order number. Clearance and custom items are final sale.
              Return shipping costs are the responsibility of the customer
              unless the item arrived damaged or defective.
            </p>
            <p className="mt-3">
              All products are covered by a <strong>2-year manufacturer
              warranty</strong> against defects in materials and workmanship.
              Refunds are issued to the original payment method within 5–10
              business days of us receiving and inspecting the returned item.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              7. Damaged or Defective Items
            </h2>
            <p className="mt-3">
              If your item arrives damaged or defective, please contact us
              within 7 days of delivery at{" "}
              <a
                href="mailto:support@amazinghomefurniturestore.com"
                className="text-walnut underline hover:text-walnut/80"
              >
                support@amazinghomefurniturestore.com
              </a>{" "}
              with photos of the damage and your order number. We will arrange a
              replacement or full refund at no additional cost to you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              8. Use of the Site
            </h2>
            <p className="mt-3">
              You agree to use our Site only for lawful purposes. You must not:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                Use the Site in any way that violates applicable laws or
                regulations
              </li>
              <li>
                Attempt to gain unauthorised access to any part of the Site or
                our systems
              </li>
              <li>
                Transmit any unsolicited or unauthorised advertising or
                promotional material
              </li>
              <li>
                Use automated tools to scrape, crawl, or extract data from the
                Site without our written permission
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              9. Intellectual Property
            </h2>
            <p className="mt-3">
              All content on this Site — including text, images, logos, product
              descriptions, and design — is the property of Amazing Home
              Furniture or its content suppliers and is protected by applicable
              intellectual property laws. You may not reproduce, distribute, or
              create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              10. Limitation of Liability
            </h2>
            <p className="mt-3">
              To the fullest extent permitted by law, Amazing Home Furniture
              shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising out of or relating to
              your use of the Site or any products purchased through the Site.
              Our total liability to you for any claim arising from a purchase
              shall not exceed the amount paid by you for the relevant order.
            </p>
            <p className="mt-3">
              Nothing in these Terms limits our liability for death or personal
              injury caused by negligence, fraud, or any other liability that
              cannot be excluded by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              11. Disclaimer of Warranties
            </h2>
            <p className="mt-3">
              The Site and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis without warranties of any kind, either express or
              implied, including but not limited to implied warranties of
              merchantability or fitness for a particular purpose. We do not
              warrant that the Site will be uninterrupted, error-free, or free
              of viruses or other harmful components.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              12. Governing Law
            </h2>
            <p className="mt-3">
              These Terms are governed by and construed in accordance with the
              laws of the State of Illinois, without regard to its conflict of
              law provisions. Any disputes arising under these Terms shall be
              subject to the exclusive jurisdiction of the courts located in the
              State of Illinois.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-charcoal">
              13. Contact Us
            </h2>
            <p className="mt-3">
              For questions about these Terms, please contact us:
            </p>
            <p className="mt-2">
              Amazing Home Furniture
              <br />
              Email:{" "}
              <a
                href="mailto:support@amazinghomefurniturestore.com"
                className="text-walnut underline hover:text-walnut/80"
              >
                support@amazinghomefurniturestore.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
