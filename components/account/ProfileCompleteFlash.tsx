"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * One-time success banner when profile completeness is 100%; fades out then unmounts.
 */
export default function ProfileCompleteFlash() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setFadeOut(true), 1800);
    const hide = window.setTimeout(() => setShow(false), 2500);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900 shadow-sm transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      role="status"
    >
      <p className="flex items-center justify-center gap-2 text-sm font-medium">
        <Check className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
        Profile complete ✓
      </p>
    </div>
  );
}
