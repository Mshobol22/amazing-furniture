"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";

interface HeroSlide {
  id: string;
  headline: string;
  subheading: string | null;
  cta_label: string;
  cta_href: string;
  image_url: string;
}

interface HeroSlideshowProps {
  slides: HeroSlide[];
}

const BLUR_DATA =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

export default function HeroSlideshow({ slides }: HeroSlideshowProps) {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating || index === current) return;
      setIsAnimating(true);
      setCurrent(index);
      setTimeout(() => setIsAnimating(false), 600);
    },
    [current, isAnimating]
  );

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, slides.length, goTo]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, slides.length, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const slide = slides[current];

  return (
    <section className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden bg-forest-dark">
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== current}
        >
          <Image
            src={s.image_url}
            alt={s.headline}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60"
            aria-hidden
          />
          <NoiseOverlay opacity={0.03} />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
        <div
          key={current}
          className="flex max-w-3xl flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          <span className="text-sm font-medium uppercase tracking-[0.3em] text-white/80">
            Amazing Home Furniture
          </span>
          <h1 className="font-display text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
            {slide.headline}
          </h1>
          {slide.subheading && (
            <p className="max-w-xl text-lg text-white/85 sm:text-xl">
              {slide.subheading}
            </p>
          )}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              className="bg-forest text-cream hover:bg-forest-light px-8 py-3 text-base"
            >
              <Link href={slide.cta_href}>{slide.cta_label}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 hover:text-white px-8 py-3 text-base"
            >
              <Link href="/collections/all">Browse All</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
