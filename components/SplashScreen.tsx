"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const SPLASH_STORAGE_KEY = "splashShown";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SPLASH_STORAGE_KEY)) return;
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setFading(true), 1600);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF8F5]"
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => {
        if (fading) setVisible(false);
      }}
    >
        <div className="text-center">
          <p
            className="font-display text-4xl italic"
            style={{ color: "#2D4A3E" }}
          >
            Amazing
          </p>
          <p
            className="font-display text-5xl font-bold"
            style={{ color: "#1C1C1C" }}
          >
            Home Furniture
          </p>
        </div>
        <div className="mx-auto mt-6 h-0.5 w-48 overflow-hidden rounded bg-gray-200">
          <motion.div
            className="h-full rounded bg-[#2D4A3E]"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        </div>
    </motion.div>
  );
}
