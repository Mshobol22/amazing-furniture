import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LifestyleSplit() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg lg:aspect-auto lg:min-h-[500px]">
          <Image
            src="/placeholder-furniture.svg"
            alt="Designed for real living"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className="flex flex-col justify-center py-12 lg:py-0">
          <h2 className="font-cormorant text-3xl font-semibold tracking-wide text-[#2D4A3E] sm:text-4xl md:text-4xl">
            Designed for Real Living
          </h2>
          <p className="mt-6 font-cormorant text-lg font-normal italic leading-relaxed text-[#1C1C1C]/60">
            Every piece in our collection is crafted with intention. We believe
            furniture should adapt to your life—comfortable for everyday use,
            beautiful for special moments, and built to last for generations.
            Discover the perfect balance of form and function.
          </p>
          <Button
            asChild
            className="mt-8 w-fit bg-walnut text-cream hover:bg-walnut/90"
          >
            <Link href="/discover">Explore Collection</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
