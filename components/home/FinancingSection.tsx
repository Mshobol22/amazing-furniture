import { CreditCard } from "lucide-react";
import Image from "next/image";

const FINANCING_OPTIONS = [
  {
    name: "Synchrony",
    description:
      "0% APR financing for 6–12 months on qualifying purchases. Apply online in minutes.",
    href: "https://www.mysynchrony.com/mmc/GI235655800",
    cta: "Apply with Synchrony",
    image: "/logos/synchrony.png",
    fallbackClass: "bg-black",
  },
  {
    name: "Koalafi",
    description:
      "Lease-to-own financing with flexible payment plans. No credit needed — approval in seconds.",
    href: "http://dealer.koalafi.com/ApplicationForm/IntroScreen?publicStoreId=828ad4f3-138a-4ccc-ac65-2bf170a430aa&cm=Copy",
    cta: "Apply with Koalafi",
    image: "/logos/koalafi.png",
    fallbackClass: "bg-[#0D2640]",
  },
];

export default function FinancingSection() {
  return (
    <section className="bg-[#FAF8F5] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-[#2D4A3E]" />
          <h2 className="font-cormorant text-3xl font-semibold tracking-wide text-[#2D4A3E] md:text-4xl">
            Flexible Financing Options
          </h2>
        </div>
        <p className="mb-8 max-w-2xl font-cormorant text-lg font-normal italic text-[#1C1C1C]/60">
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
              className={`group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A3E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F5] sm:min-h-[300px] ${opt.fallbackClass}`}
            >
              <Image
                src={opt.image}
                alt=""
                fill
                className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, 50vw"
                priority={false}
              />
              {/* Bottom scrim so description + CTA stay readable on branded artwork */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
                aria-hidden
              />
              <div className="relative z-10 flex flex-col p-6">
                <h3 className="font-sans text-lg font-semibold text-white drop-shadow-md sm:text-xl">
                  {opt.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/95 drop-shadow-sm sm:text-[0.9375rem]">
                  {opt.description}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#FAF8F5] drop-shadow-md group-hover:underline">
                  {opt.cta} &rarr;
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
