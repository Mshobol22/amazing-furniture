"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthNav from "@/components/layout/AuthNav";

const signupSchema = z
  .object({
    fullName: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const searchParams = useSearchParams();
  const redirectQuery = searchParams.get("redirect");
  const loginHref = redirectQuery
    ? `/auth/login?redirect=${encodeURIComponent(redirectQuery)}`
    : "/auth/login";

  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { phone: "" },
  });

  const supabase = createClient();

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setResendStatus(null);
    setIsLoading(true);
    try {
      const phoneTrimmed = data.phone?.trim() || "";
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            ...(phoneTrimmed ? { phone: phoneTrimmed } : {}),
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }
      setSuccessEmail(data.email);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleSignUp = async () => {
    setError(null);
    try {
      const nextPath = searchParams.get("redirect") || "/account";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
    } catch {
      setError("Failed to sign up with Google");
    }
  };

  const onResend = async () => {
    if (!successEmail) return;
    setResendStatus(null);
    setResendLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: successEmail,
      });
      if (resendError) {
        setResendStatus(resendError.message);
      } else {
        setResendStatus("Confirmation email sent again.");
      }
    } catch {
      setResendStatus("Could not resend — please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (successEmail) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
        <AuthNav />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-xl border border-light-sand bg-white p-8 shadow-sm text-center">
              <Link
                href="/"
                className="mb-6 block font-playfair text-2xl font-semibold text-charcoal hover:opacity-80"
              >
                Amazing Home Furniture
              </Link>
              <h1 className="mb-3 text-xl font-semibold text-charcoal">Check your email</h1>
              <p className="mb-6 text-warm-gray">
                We sent a confirmation link to <span className="font-medium text-charcoal">{successEmail}</span>.
                Click it to activate your account.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mb-3 w-full border-charcoal"
                disabled={resendLoading}
                onClick={onResend}
              >
                {resendLoading ? "Sending…" : "Resend confirmation email"}
              </Button>
              {resendStatus && <p className="text-sm text-warm-gray">{resendStatus}</p>}
            </div>
            <p className="mt-6 text-center text-sm text-warm-gray">
              Already have an account?{" "}
              <Link href={loginHref} className="font-medium text-walnut hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

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

            <Button
              type="button"
              variant="outline"
              className="mb-6 w-full border-charcoal"
              onClick={onGoogleSignUp}
            >
              <GoogleIcon />
              <span className="ml-2">Continue with Google</span>
            </Button>

            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-light-sand" />
              <span className="text-sm text-warm-gray">or</span>
              <div className="h-px flex-1 bg-light-sand" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="auth-signup-name">Full Name</Label>
                <Input
                  id="auth-signup-name"
                  {...register("fullName")}
                  className="mt-1"
                  autoComplete="name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="auth-signup-email">Email</Label>
                <Input
                  id="auth-signup-email"
                  type="email"
                  {...register("email")}
                  className="mt-1"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="auth-signup-password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="auth-signup-password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-warm-gray hover:text-charcoal"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="auth-signup-confirm">Confirm Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="auth-signup-confirm"
                    type={showConfirm ? "text" : "password"}
                    {...register("confirmPassword")}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-warm-gray hover:text-charcoal"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="auth-signup-phone">Phone (optional — used for delivery updates)</Label>
                <Input
                  id="auth-signup-phone"
                  type="tel"
                  {...register("phone")}
                  className="mt-1"
                  autoComplete="tel"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-walnut text-cream hover:bg-walnut/90"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-warm-gray">
            Already have an account?{" "}
            <Link href={loginHref} className="font-medium text-walnut hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
