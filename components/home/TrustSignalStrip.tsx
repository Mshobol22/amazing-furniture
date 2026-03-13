import { Truck, RotateCcw, CreditCard, Star } from "lucide-react";

const SIGNALS = [
  { icon: Truck, text: "Free Delivery on Orders $500+" },
  { icon: RotateCcw, text: "Easy 30-Day Returns" },
  { icon: CreditCard, text: "Flexible Financing Available" },
  { icon: Star, text: "Trusted by 10,000+ Customers" },
];

export default function TrustSignalStrip() {
  return (
    <div className="flex w-full flex-nowrap items-center justify-center gap-8 overflow-x-auto bg-[#1C1C1C] py-4 px-4">
      {SIGNALS.map(({ icon: Icon, text }) => (
        <div
          key={text}
          className="flex shrink-0 items-center gap-2 text-[#FAF8F5]"
        >
          <Icon className="h-4 w-4 text-[#8B6914]" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}
