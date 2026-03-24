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
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-[#0D2818] py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/account"
            className="inline-flex text-sm font-medium text-white/60 hover:text-white transition-colors mb-4"
          >
            ← Back to Account
          </Link>
          <h1 className=" text-2xl font-semibold text-white">
            Account Settings
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <Label htmlFor="email" className="text-gray-600">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              className="mt-1 border-gray-200 bg-gray-50 text-[#1C1C1C]"
            />
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full border-gray-300 text-gray-700 hover:bg-gray-50"
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
