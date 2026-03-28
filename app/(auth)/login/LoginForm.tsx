"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthNav from "@/components/layout/AuthNav";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function GoogleIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectQuery = searchParams.get("redirect");
  const signupHref = redirectQuery
    ? `/signup?redirect=${encodeURIComponent(redirectQuery)}`
    : "/signup";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const supabase = createClient();

  const onEmailSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }
      const redirect = searchParams.get("redirect") || "/account";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
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
      setError("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1C1C1C]">
      <AuthNav />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-light-sand bg-white p-8 shadow-sm">
          <h1 className="mb-8 text-center text-2xl font-semibold text-charcoal">
            Amazing Home Furniture
          </h1>

          <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="mt-1"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="mt-1"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-walnut text-cream hover:bg-walnut/90"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-light-sand" />
            <span className="text-sm text-warm-gray">or</span>
            <div className="h-px flex-1 bg-light-sand" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-charcoal"
            onClick={onGoogleSignIn}
          >
            <GoogleIcon />
            <span className="ml-2">Continue with Google</span>
          </Button>

          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-warm-gray">
              Don&apos;t have an account?{" "}
              <Link href={signupHref} className="font-medium text-walnut hover:underline">
                Sign up
              </Link>
            </p>
            <p>
              <Link
                href="#"
                className="text-warm-gray hover:text-charcoal"
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
