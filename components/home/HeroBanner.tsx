"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const BLUR_DATA =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

export default function HeroBanner() {
  return (
    <section className="relative flex min-h-[85vh] w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/placeholder-furniture.svg"
          alt="Luxury living room"
          fill
          className="object-cover"
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"
          aria-hidden
        />
        <NoiseOverlay opacity={0.04} />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex max-w-3xl flex-col items-center gap-6"
        >
          <motion.span
            variants={item}
            className="text-sm font-medium uppercase tracking-[0.3em] text-white/90"
          >
            New Collection 2025
          </motion.span>
          <motion.h1
            variants={item}
            className="font-playfair text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            Elevate Your Living Space
          </motion.h1>
          <motion.p
            variants={item}
            className="font-cormorant text-lg font-normal italic text-white/85 sm:text-xl"
          >
            Handcrafted furniture for the modern home
          </motion.p>
          <motion.div
            variants={item}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button
              asChild
              className="bg-walnut text-cream hover:bg-walnut/90"
            >
              <Link href="/collections/all">Shop Now</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/collections/sofa">View Lookbook</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
