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
    "Flexible financing options for your furniture purchase at Amazing Home Furniture with Synchrony and Koalafi.",
};

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
    a: "Your approved financing partner (Synchrony or Koalafi) will provide your payment schedule and repayment options.",
  },
  {
    q: "Can I pay off early?",
    a: "Yes, early payoff is allowed with no prepayment penalties.",
  },
  {
    q: "Which financing partners do you offer?",
    a: "We partner with Synchrony and Koalafi for flexible furniture financing options.",
  },
];

export default function FinancingPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero section */}
      <section className="relative overflow-hidden bg-[#0D2818] py-20">
        <NoiseOverlay opacity={0.04} />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white">
          <span className="text-sm font-semibold uppercase tracking-widest text-[#2D4A3E]">
            Flexible Payments
          </span>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Buy Now, Pay Later
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Furnish your entire home today with flexible financing through our
            approved partners, Synchrony and Koalafi.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.mysynchrony.com/mmc/GI235655800"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2D4A3E] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#1E3329]"
            >
              Apply with Synchrony
            </a>
            <a
              href="http://dealer.koalafi.com/ApplicationForm/IntroScreen?publicStoreId=828ad4f3-138a-4ccc-ac65-2bf170a430aa&cm=Copy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-semibold text-white transition-colors hover:bg-white/20"
            >
              Apply with Koalafi
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold text-[#1C1C1C]">
            How It Works
          </h2>
          <div className="grid gap-8 text-center md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step}>
                <div className="mb-2 text-4xl font-bold text-[#2D4A3E]/30">
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
          <h2 className="mb-8 text-center text-2xl font-bold text-[#1C1C1C]">
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
