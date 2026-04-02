"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function AccountSignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full border-charcoal/30 text-charcoal hover:bg-[#FAF8F5]"
      onClick={() => void signOut()}
    >
      Sign out
    </Button>
  );
}
