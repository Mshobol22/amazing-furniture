"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandNotifyFormProps {
  brandName: string;
}

export default function BrandNotifyForm({ brandName }: BrandNotifyFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "brand-notify",
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col items-center gap-4">
      <p className="text-sm text-warm-gray">
        Get notified when {brandName} products arrive.
      </p>
      {status === "done" ? (
        <p className="text-sm font-medium text-[#2D4A3E]">
          You&apos;re on the list! We&apos;ll email you when {brandName}{" "}
          products launch.
        </p>
      ) : (
        <div className="flex w-full max-w-md gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-charcoal placeholder-warm-gray focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
            />
          </div>
          <Button
            type="submit"
            disabled={status === "loading"}
            className="shrink-0 bg-[#1C1C1C] text-white hover:bg-[#2a2a2a] disabled:opacity-50"
          >
            {status === "loading" ? "..." : "Notify Me"}
          </Button>
        </div>
      )}
      {status === "error" && (
        <p className="text-xs text-red-500">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
