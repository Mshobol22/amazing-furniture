import { CreditCard } from "lucide-react";
import Image from "next/image";

const FINANCING_OPTIONS = [
  {
    name: "Synchrony",
    description:
      "0% APR financing for 6–12 months on qualifying purchases. Apply online in minutes.",
    href: "https://www.mysynchrony.com/mmc/GI235655800",
    cta: "Apply with Synchrony",
    logo: "/logos/synchrony.png",
  },
  {
    name: "Koalafi",
    description:
      "Lease-to-own financing with flexible payment plans. No credit needed — approval in seconds.",
    href: "http://dealer.koalafi.com/ApplicationForm/IntroScreen?publicStoreId=828ad4f3-138a-4ccc-ac65-2bf170a430aa&cm=Copy",
    cta: "Apply with Koalafi",
    logo: "/logos/koalafi.png",
  },
];

export default function FinancingSection() {
  return (
    <section className="bg-[#FAF8F5] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-[#2D4A3E]" />
          <h2 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
            Flexible Financing Options
          </h2>
        </div>
        <p className="mb-8 max-w-2xl text-warm-gray">
          Make your dream furniture affordable with our financing partners.
          Apply online — no obligation, no impact on your credit score to check
          your options.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FINANCING_OPTIONS.map((opt) => (
            <a
              key={opt.name}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-[#ede8e3] bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-20 items-center justify-center rounded-md bg-[#FAF8F5] p-3">
                <Image
                  src={opt.logo}
                  alt={opt.name}
                  width={220}
                  height={80}
                  className="max-h-[56px] w-auto object-contain"
                />
              </div>
              <h3 className="font-display text-lg font-semibold text-charcoal group-hover:text-[#2D4A3E]">
                {opt.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-warm-gray">
                {opt.description}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-[#2D4A3E] group-hover:underline">
                {opt.cta} &rarr;
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
