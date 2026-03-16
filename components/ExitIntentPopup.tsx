"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISCOUNT_CODE = "WELCOME10";

export default function ExitIntentPopup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeOnSite, setTimeOnSite] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [triggered, setTriggered] = useState(false);

  const blockedPaths = ["/checkout", "/login", "/signup", "/admin"];
  const isBlocked = blockedPaths.some((p) => pathname.startsWith(p));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isBlocked) return;
    const interval = setInterval(() => {
      setTimeOnSite((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, isBlocked]);

  useEffect(() => {
    if (!mounted || isBlocked || visible || success || triggered) return;
    const handleMouseMove = (e: MouseEvent) => setMouseY(e.clientY);
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mounted, isBlocked, visible, success, triggered]);

  useEffect(() => {
    if (!mounted || isBlocked || visible || success || triggered) return;
    if (timeOnSite < 5) return;
    if (mouseY >= 10) return;

    const timer = setTimeout(() => {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("exit_popup_shown")) {
        return;
      }
      setTriggered(true);
      setVisible(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [mounted, isBlocked, visible, success, triggered, timeOnSite, mouseY]);

  const handleClose = () => {
    sessionStorage.setItem("exit_popup_shown", "true");
    setVisible(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    sessionStorage.setItem("exit_popup_shown", "true");
    localStorage.setItem(
      "discount_claimed",
      JSON.stringify({
        email: email.trim(),
        code: DISCOUNT_CODE,
        date: new Date().toISOString(),
      })
    );
    setSuccess(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(DISCOUNT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="relative max-w-[480px] rounded-xl bg-white shadow-xl"
        style={{
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <div className="flex">
          <div
            className="w-1.5 shrink-0 rounded-l-xl"
            style={{ backgroundColor: "#2D4A3E" }}
          />
          <div className="flex-1 p-8">
            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-charcoal">
                  You&apos;re in!
                </h2>
                <p className="mt-2 text-warm-gray">Your code is:</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="rounded-lg bg-gray-100 px-4 py-2 font-mono text-xl font-bold text-charcoal">
                    {DISCOUNT_CODE}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-4 text-sm text-warm-gray">
                  Use it at checkout for 10% off your order
                </p>
                <Button
                  onClick={handleClose}
                  className="mt-6 w-full bg-charcoal text-cream hover:bg-charcoal/90"
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                  style={{ color: "#2D4A3E" }}
                >
                  Exclusive Offer
                </p>
                <h2 className="mt-2 font-display text-[28px] font-semibold text-charcoal">
                  Before You Go...
                </h2>
                <p
                  className="mt-2 text-lg font-medium"
                  style={{ color: "#2D4A3E" }}
                >
                  Get 10% off your first order
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#666]">
                  Join our community and receive your discount code instantly.
                  Plus, be the first to hear about new arrivals and special events.
                </p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Your email address"
                    className="w-full rounded-md border border-gray-200 bg-[#FAF8F5] px-4 py-3 text-sm outline-none placeholder:text-warm-gray focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
                  />
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-charcoal text-cream hover:bg-[#2D4A3E]"
                  >
                    Claim My 10% Off
                  </Button>
                </form>
                <button
                  onClick={handleClose}
                  className="mt-4 w-full text-sm text-warm-gray hover:text-charcoal"
                >
                  No thanks, I&apos;ll pay full price
                </button>
                <p className="mt-4 text-[11px] text-gray-500">
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-warm-gray hover:text-charcoal"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
