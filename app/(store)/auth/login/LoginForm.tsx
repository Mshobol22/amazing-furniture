"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { profileRowFromAuthUser } from "@/lib/auth/profile-from-user";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthNav from "@/components/layout/AuthNav";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function mapSignInError(err: { message?: string; code?: string } | null): string {
  if (!err) return "Something went wrong — please try again.";
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Please check your email to confirm your account before signing in.";
  }
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials") ||
    msg.includes("invalid email or password")
  ) {
    return "Incorrect email or password.";
  }
  return "Something went wrong — please try again.";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectQuery = searchParams.get("redirect");
  const signupHref = redirectQuery
    ? `/auth/signup?redirect=${encodeURIComponent(redirectQuery)}`
    : "/auth/signup";
  const authError = searchParams.get("error");

  const [error, setError] = useState<string | null>(
    authError === "auth" ? "Sign-in failed. Please try again." : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      const { data: signData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) {
        setError(mapSignInError(signInError));
        setIsLoading(false);
        return;
      }
      const user = signData.user ?? signData.session?.user;
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profileRowFromAuthUser(user), { onConflict: "user_id" });
        if (profileError) {
          console.error("login profile upsert:", profileError.message);
        }
      }
      const redirect = searchParams.get("redirect") || "/account";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
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
              onClick={onGoogleSignIn}
            >
              <GoogleIcon />
              <span className="ml-2">Continue with Google</span>
            </Button>

            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-light-sand" />
              <span className="text-sm text-warm-gray">or</span>
              <div className="h-px flex-1 bg-light-sand" />
            </div>

            <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="auth-login-email">Email</Label>
                <Input
                  id="auth-login-email"
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
                <Label htmlFor="auth-login-password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="auth-login-password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="pr-10"
                    autoComplete="current-password"
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

              <div className="text-right text-sm">
                <Link href="/auth/forgot-password" className="text-walnut hover:underline">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-walnut text-cream hover:bg-walnut/90"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-warm-gray">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="font-medium text-walnut hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
