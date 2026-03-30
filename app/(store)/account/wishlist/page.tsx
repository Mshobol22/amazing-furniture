import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WishlistAccountGrid from "@/components/account/WishlistAccountGrid";
import {
  applyAcmeComponentListingFilter,
  attachZinatexFromPrices,
  mapRowToProduct,
} from "@/lib/supabase/products";
import type { Product } from "@/types";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default async function AccountWishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? "/account/wishlist";
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const { data: wishRows } = await supabase
    .from("wishlists")
    .select("product_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (wishRows ?? []).map((r) => r.product_id as string).filter(Boolean);

  if (ids.length === 0) {
    return (
      <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-10 text-center shadow-sm">
        <h1 className="font-sans text-xl font-semibold text-charcoal">Wishlist</h1>
        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2D4A3E]/10 text-2xl">
          ❤
        </div>
        <p className="mt-3 text-warm-gray">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-warm-gray">
          Save favorites to build your room mood board.
        </p>
        <Link
          href="/collections/all"
          className="mt-6 inline-flex rounded-lg bg-[#2D4A3E] px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#1E3329]"
        >
          Browse our collections
        </Link>
      </div>
    );
  }

  let wishlistProductsQuery = supabase.from("products").select("*").in("id", ids);
  wishlistProductsQuery = applyAcmeComponentListingFilter(wishlistProductsQuery);
  const { data: rawRows } = await wishlistProductsQuery;

  const byId = new Map(
    (rawRows ?? []).map((r) => {
      const p = mapRowToProduct(r as Record<string, unknown>);
      return [p.id, p] as const;
    })
  );
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p));
  const orderedEnriched = await attachZinatexFromPrices(ordered);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">Wishlist</h1>
        <p className="mt-1 text-sm text-warm-gray">{orderedEnriched.length} saved items</p>
      </div>
      <WishlistAccountGrid products={orderedEnriched} />
    </div>
  );
}
