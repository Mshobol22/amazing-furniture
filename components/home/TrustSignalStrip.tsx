import { Truck, CreditCard, Star, MapPin } from "lucide-react";
import Link from "next/link";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";

const SIGNALS = [
  { icon: Truck, text: "Free Shipping on All Orders Over $299", href: null },
  { icon: CreditCard, text: "Flexible Financing Available", href: "/financing" },
  { icon: Star, text: "Trusted by Thousands of Customers" },
  { icon: MapPin, text: "Illinois-Based Business" },
];

export default function TrustSignalStrip() {
  return (
    <section className="relative overflow-hidden bg-[#2D4A3E] py-4">
      <NoiseOverlay opacity={0.06} />
      <div className="relative z-10 flex w-full flex-nowrap items-center justify-center gap-8 overflow-x-auto px-4">
        {SIGNALS.map(({ icon: Icon, text, href }) => {
          const content = (
            <>
              <Icon className="h-4 w-4 text-white" />
              <span className="font-sans text-sm font-medium uppercase tracking-wide">
                {text}
              </span>
            </>
          );

          if (href) {
            return (
              <Link
                key={text}
                href={href}
                className="flex shrink-0 items-center gap-2 text-[#FAF8F5] underline-offset-4 hover:underline"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={text} className="flex shrink-0 items-center gap-2 text-[#FAF8F5]">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
