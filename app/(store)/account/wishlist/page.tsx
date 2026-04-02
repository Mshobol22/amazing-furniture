import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountWishlistView from "@/components/account/AccountWishlistView";
import {
  applyAcmeComponentListingFilter,
  attachZinatexFromPrices,
  mapRowToProduct,
} from "@/lib/supabase/products";
import type { Product } from "@/types";
import type { WishlistAccountEntry } from "@/types/wishlist-account";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default async function AccountWishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/account/wishlist")}`);
  }

  const { data: wishRows } = await supabase
    .from("wishlists")
    .select("id, product_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = wishRows ?? [];
  const productIds = [...new Set(rows.map((r) => r.product_id as string).filter(Boolean))];

  if (productIds.length === 0) {
    return <AccountWishlistView initialEntries={[]} />;
  }

  let productsQuery = supabase.from("products").select("*").in("id", productIds);
  productsQuery = applyAcmeComponentListingFilter(productsQuery);
  const { data: rawRows } = await productsQuery;

  const byProductId = new Map(
    (rawRows ?? []).map((r) => {
      const p = mapRowToProduct(r as Record<string, unknown>);
      return [p.id, p] as const;
    })
  );

  const ordered: Product[] = [];
  for (const id of productIds) {
    const p = byProductId.get(id);
    if (p) ordered.push(p);
  }

  const enriched = await attachZinatexFromPrices(ordered);
  const enrichedById = new Map(enriched.map((p) => [p.id, p]));

  const initialEntries: WishlistAccountEntry[] = [];
  for (const w of rows) {
    const pid = w.product_id as string;
    const product = enrichedById.get(pid);
    if (product) {
      initialEntries.push({ wishlistId: w.id as string, product });
    }
  }

  return <AccountWishlistView initialEntries={initialEntries} />;
}
