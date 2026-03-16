import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Amazing Home Furniture — shipping, returns, delivery, assembly and more.",
};

const FAQ_ITEMS = [
  {
    value: "payment",
    q: "What payment methods do you accept?",
    a: "Visa, Mastercard, Amex via Stripe. Secure checkout.",
  },
  {
    value: "shipping",
    q: "Do you offer free shipping?",
    a: "Yes, free standard shipping on all orders over $299.",
  },
  {
    value: "returns",
    q: "What is your return policy?",
    a: "We accept returns on unused, unassembled items in original packaging. Contact us at support@amazinghomefurniturestore.com to initiate a return.",
  },
  {
    value: "delivery",
    q: "How long does delivery take?",
    a: "Standard: 5-10 business days. Express: 2-5 business days.",
  },
  {
    value: "assembly",
    q: "Do you assemble furniture?",
    a: "Assembly instructions included. White-glove service available for select items.",
  },
  {
    value: "cancel",
    q: "Can I cancel my order?",
    a: "Yes, within 24 hours of placing. Email support@amazinghomefurniture.com",
  },
  {
    value: "international",
    q: "Do you ship outside the US?",
    a: "Currently we ship to the contiguous 48 states only.",
  },
  {
    value: "track",
    q: "How do I track my order?",
    a: "You'll receive a tracking email once shipped. You can also visit our Track Order page.",
  },
  {
    value: "damaged",
    q: "What if my item arrives damaged?",
    a: "Contact us within 48 hours with photos. We'll replace or refund immediately.",
  },
  {
    value: "financing",
    q: "Do you offer financing?",
    a: "Not currently. Coming soon.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
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
