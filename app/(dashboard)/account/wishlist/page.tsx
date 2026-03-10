import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AccountSidebar from "../AccountSidebar";
import { Heart } from "lucide-react";

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <AccountSidebar
            user={{
              displayName,
              email: user.email ?? "",
              initials,
              avatarUrl: user.user_metadata?.avatar_url,
            }}
          />
          <main className="flex-1">
            <div className="rounded-lg border border-light-sand bg-white p-6">
              <h2 className="mb-6 font-display text-2xl font-semibold text-charcoal">
                Wishlist
              </h2>
              <div className="flex flex-col items-center justify-center py-16">
                <Heart className="mb-4 h-16 w-16 text-warm-gray" />
                <p className="mb-2 font-medium text-charcoal">No items in wishlist</p>
                <p className="mb-6 text-sm text-warm-gray">
                  Save items you love for later.
                </p>
                <Link href="/products">
                  <span className="inline-block rounded-md bg-walnut px-4 py-2 text-cream hover:bg-walnut/90">
                    Browse Products
                  </span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
