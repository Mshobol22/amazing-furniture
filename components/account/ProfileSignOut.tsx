"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ProfileSignOut({
  displayName,
  email,
  avatarUrl,
  initials,
}: {
  displayName: string;
  email: string;
  avatarUrl?: string;
  initials: string;
}) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-8 shadow-sm">
      <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">Profile</h1>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {avatarUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-[#2D4A3E]/20">
            <Image
              src={avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#2D4A3E] text-2xl font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="text-center sm:text-left">
          <p className="font-sans text-lg font-semibold text-charcoal">{displayName}</p>
          <p className="mt-1 text-sm text-warm-gray">{email}</p>
        </div>
      </div>
      <div className="mt-10 border-t border-light-sand pt-8">
        <Button
          type="button"
          variant="outline"
          className="border-charcoal text-charcoal hover:bg-[#FAF8F5]"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
