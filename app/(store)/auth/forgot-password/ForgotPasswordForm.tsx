"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthNav from "@/components/layout/AuthNav";

const schema = z.object({
  email: z.string().email("Valid email is required"),
});

type FormData = z.infer<typeof schema>;

function mapResetError(err: { message?: string; code?: string } | null): string {
  if (!err?.message) return "Something went wrong — please try again.";
  const msg = err.message.toLowerCase();
  if (
    msg.includes("user not found") ||
    msg.includes("not registered") ||
    msg.includes("no user")
  ) {
    return "No account found with that email";
  }
  return "Something went wrong — please try again.";
}

export default function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const supabase = createClient();

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);
    try {
      const redirectTo =
        "https://www.amazinghomefurniturestore.com/auth/callback?next=/auth/reset-password";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });
      if (resetError) {
        setError(mapResetError(resetError));
        setIsLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
      <AuthNav />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-light-sand bg-white p-8 shadow-sm">
            <Link
              href="/"
              className="mb-6 block text-center font-playfair text-2xl font-semibold text-charcoal hover:opacity-80"
            >
              Amazing Home Furniture
            </Link>

            {done ? (
              <>
                <h1 className="mb-3 text-center text-xl font-semibold text-charcoal">
                  Reset link sent
                </h1>
                <p className="text-center text-warm-gray">
                  Check your email. The link expires in 1 hour.
                </p>
              </>
            ) : (
              <>
                <h1 className="mb-2 text-center text-xl font-semibold text-charcoal">
                  Reset your password
                </h1>
                <p className="mb-6 text-center text-sm text-warm-gray">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      {...register("email")}
                      className="mt-1"
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-walnut text-cream hover:bg-walnut/90"
                  >
                    {isLoading ? "Sending…" : "Send Reset Link"}
                  </Button>
                </form>
              </>
            )}

            <p className="mt-6 text-center text-sm">
              <Link href="/auth/login" className="font-medium text-walnut hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
