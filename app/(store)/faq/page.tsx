import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    value: "payment",
    q: "What payment methods do you accept?",
    a: "We accept Visa and Mastercard through our secure Stripe checkout. All payments are processed securely.",
  },
  {
    value: "shipping",
    q: "Do you offer free shipping?",
    a: "Yes! We offer free standard shipping on all orders over $299. Orders under $299 have a flat $29 shipping fee.",
  },
  {
    value: "returns",
    q: "What is your return policy?",
    a: "We offer a 30-day easy return policy. Items must be in original condition and packaging. Refunds are processed within 5-7 business days.",
  },
  {
    value: "delivery",
    q: "How long does delivery take?",
    a: "Standard shipping takes 5-10 business days. Express shipping (2-5 business days) is available for an additional fee.",
  },
  {
    value: "assembly",
    q: "Do you assemble furniture?",
    a: "Assembly instructions are included with all furniture. White-glove assembly service is available for select items for an additional fee.",
  },
  {
    value: "cancel",
    q: "Can I cancel my order?",
    a: "Yes, you may cancel your order within 24 hours of placing it. Contact us at support@amazinghomefurniture.com to request a cancellation.",
  },
  {
    value: "financing",
    q: "Do you offer financing?",
    a: "We do not currently offer financing, but we're working on it. Check back soon!",
  },
  {
    value: "track",
    q: "How do I track my order?",
    a: "Once your order ships, you'll receive a tracking number via email. You can also visit our Order Tracking page (see link below).",
  },
];

export default function FAQPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">FAQ</span>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-charcoal">
          Frequently Asked Questions
        </h1>

        <Accordion type="single" collapsible defaultValue="payment" className="rounded-lg border border-gray-200 bg-white">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.value} value={item.value} className="px-4">
              <AccordionTrigger className="text-left font-medium text-charcoal hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-6 text-sm text-warm-gray">
          Need more help?{" "}
          <Link href="/track-order" className="text-walnut hover:underline">
            Track your order
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="text-walnut hover:underline">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
