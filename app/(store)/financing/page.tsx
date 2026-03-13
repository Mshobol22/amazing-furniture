import { NoiseOverlay } from "@/components/ui/NoiseOverlay";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "Financing",
  description:
    "Flexible financing options for your furniture purchase at Amazing Home Furniture. Buy now, pay later with Snap Finance.",
};

const PLANS = [
  { plan: "3 Months", apr: "0% APR*", min: "$200+", highlight: false, badge: null },
  { plan: "6 Months", apr: "0% APR*", min: "$400+", highlight: true, badge: "Most Popular" },
  { plan: "12 Months", apr: "Low APR", min: "$800+", highlight: false, badge: null },
];

const STEPS = [
  {
    step: "01",
    title: "Apply Online",
    desc: "Complete a quick 2-minute application with no hard credit pull.",
  },
  {
    step: "02",
    title: "Get Approved",
    desc: "Receive an instant decision. Most customers are approved.",
  },
  {
    step: "03",
    title: "Shop & Pay Later",
    desc: "Place your order and make easy scheduled payments.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Does applying affect my credit score?",
    a: "No — the initial application uses a soft credit check that does not impact your score.",
  },
  {
    q: "What is the minimum purchase amount?",
    a: "Financing is available on orders of $200 or more.",
  },
  {
    q: "How do I make payments?",
    a: "Snap Finance will set up automatic scheduled payments via your chosen payment method.",
  },
  {
    q: "Can I pay off early?",
    a: "Yes, early payoff is allowed with no prepayment penalties.",
  },
  {
    q: "Who is Snap Finance?",
    a: "Snap Finance is a trusted US-based lender specializing in flexible payment solutions for retail purchases.",
  },
];

export default function FinancingPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero section */}
      <section className="relative overflow-hidden bg-[#0D2818] py-20">
        <NoiseOverlay opacity={0.04} />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white">
          <span className="text-sm font-semibold uppercase tracking-widest text-[#8B6914]">
            Flexible Payments
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Buy Now, Pay Later
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Furnish your entire home today with flexible payment plans through
            our financing partner, Snap Finance.
          </p>
          <a
            href="https://snapfinance.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#7a5c10]"
          >
            Apply Now — Takes 2 Minutes
          </a>
        </div>
      </section>

      {/* Payment plans */}
      <section className="bg-[#FAF8F5] py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-[#1C1C1C]">
            Payment Plans
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.plan}
                className={`relative rounded-2xl border-2 p-6 ${
                  p.highlight
                    ? "border-[#8B6914] bg-white shadow-lg"
                    : "border-gray-200 bg-white"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#8B6914] px-3 py-1 text-xs font-semibold text-white">
                    {p.badge}
                  </span>
                )}
                <div className="mb-1 text-2xl font-bold text-[#1C1C1C]">
                  {p.plan}
                </div>
                <div className="mb-3 text-lg font-semibold text-[#8B6914]">
                  {p.apr}
                </div>
                <div className="text-sm text-gray-500">Orders {p.min}</div>
                <a
                  href="https://snapfinance.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block rounded-lg px-4 py-2.5 text-center font-medium transition-colors ${
                    p.highlight
                      ? "bg-[#8B6914] text-white hover:bg-[#7a5c10]"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  Apply Now
                </a>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            *Subject to approval. Terms and conditions apply via Snap Finance.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-12 text-center font-display text-2xl font-bold text-[#1C1C1C]">
            How It Works
          </h2>
          <div className="grid gap-8 text-center md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step}>
                <div className="mb-2 text-4xl font-bold text-[#8B6914]/30">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold text-[#1C1C1C]">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#FAF8F5] py-16">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-[#1C1C1C]">
            Financing FAQ
          </h2>
          <Accordion type="single" collapsible className="rounded-lg border border-gray-200 bg-white">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="px-4">
                <AccordionTrigger className="text-left font-medium text-[#1C1C1C] hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
