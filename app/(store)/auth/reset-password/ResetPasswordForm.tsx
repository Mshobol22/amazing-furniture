"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthNav from "@/components/layout/AuthNav";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const supabase = createClient();

  useEffect(() => {
    const client = createClient();
    (async () => {
      const {
        data: { session },
      } = await client.auth.getSession();
      setSessionReady(!!session);
    })();
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      router.push("/auth/login");
    }, 3000);
    return () => clearTimeout(t);
  }, [done, router]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionReady === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
        <AuthNav />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-xl border border-light-sand bg-white p-8 text-center shadow-sm">
            <p className="mb-6 text-warm-gray">
              This reset link is invalid or has expired.
            </p>
            <Link href="/auth/forgot-password" className="font-medium text-walnut hover:underline">
              Request a new reset link
            </Link>
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

            {done ? (
              <p className="text-center text-warm-gray">
                Password updated — you can now sign in with your new password. Redirecting to sign in…
              </p>
            ) : (
              <>
                <h1 className="mb-6 text-center text-xl font-semibold text-charcoal">
                  Set a new password
                </h1>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-password">New Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="reset-password"
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
                    <Label htmlFor="reset-confirm">Confirm New Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="reset-confirm"
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
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-walnut text-cream hover:bg-walnut/90"
                  >
                    {isLoading ? "Updating…" : "Update Password"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
