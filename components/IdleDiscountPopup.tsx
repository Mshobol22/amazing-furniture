"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdleTimer } from "@/hooks/useIdleTimer";

const STORAGE_KEY = "ahf_discount_popup_dismissed";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type IdleDiscountResponse = {
  success: boolean;
  code: string;
  discountPercent: number;
};

export default function IdleDiscountPopup() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IdleDiscountResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
    }
  }, []);

  useIdleTimer({
    idleThresholdMs: 45000,
    onIdle: () => {
      if (!dismissed && !visible && !result) {
        setVisible(true);
      }
    },
  });

  const shouldRender = mounted && !dismissed && visible;
  const fallbackMessage =
    "Something went wrong. Use code WELCOME10 at checkout for 10% off.";

  const headerText = useMemo(() => {
    if (result) return "🎉 Your code is ready!";
    return "Wait — Before You Go";
  }, [result]);

  const closePopup = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    setVisible(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInputError(null);
    setServerError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setInputError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/idle-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = (await response.json()) as Partial<IdleDiscountResponse>;

      if (!response.ok || !data.code || !data.discountPercent) {
        setServerError(fallbackMessage);
        return;
      }

      setResult({
        success: true,
        code: data.code,
        discountPercent: data.discountPercent,
      });
    } catch {
      setServerError(fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.code) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-xl bg-[#FAF8F5] p-6 text-[#1C1C1C] shadow-2xl">
        <button
          type="button"
          aria-label="Close popup"
          onClick={closePopup}
          className="absolute right-4 top-4 text-[#1C1C1C]/70 transition hover:text-[#1C1C1C]"
        >
          <X className="h-5 w-5" />
        </button>

        {!result ? (
          <>
            <h2 className="pr-8 text-2xl font-semibold">{headerText}</h2>
            <p className="mt-2 text-sm text-[#1C1C1C]/80">
              Get 10% off your first order. Enter your email below and we&apos;ll
              give you the code instantly.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setInputError(null);
                  setServerError(null);
                }}
                className="w-full border-[#1C1C1C]/20 bg-white"
              />
              {inputError ? (
                <p className="text-sm text-red-600">{inputError}</p>
              ) : null}
              {serverError ? (
                <p className="text-sm text-red-600">{serverError}</p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329]"
              >
                {isSubmitting ? "Submitting..." : "Get My 10% Off"}
              </Button>
            </form>
            <p className="mt-3 text-xs text-[#1C1C1C]/70">
              By subscribing you agree to receive our newsletter. Unsubscribe
              anytime.
            </p>
          </>
        ) : (
          <>
            <h2 className="pr-8 text-2xl font-semibold">{headerText}</h2>
            <div className="mt-4 rounded-md border border-[#1C1C1C]/20 bg-white px-4 py-3 text-center font-mono text-lg font-semibold">
              {result.code}
            </div>
            <Button
              type="button"
              onClick={handleCopy}
              className="mt-3 w-full bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329]"
            >
              {copied ? "Copied ✓" : "Copy Code"}
            </Button>
            <p className="mt-3 text-sm text-[#1C1C1C]/80">
              Use it at checkout for 10% off your order.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={closePopup}
              className="mt-4 w-full border-[#1C1C1C]/30 text-[#1C1C1C]"
            >
              Start Shopping
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
