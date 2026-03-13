"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LogOut } from "lucide-react";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email ?? "");
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen noise-overlay page-account-customer">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="mb-6 inline-flex text-sm font-medium text-[#a0c4a8] hover:text-white hover:underline"
        >
          ← Back to Account
        </Link>
        <h1 className="mb-8 font-display text-3xl font-semibold text-white">
          Account Settings
        </h1>
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <div>
            <Label htmlFor="email" className="text-[#a0c4a8]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full border-white/20 text-white/80 hover:border-white hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
