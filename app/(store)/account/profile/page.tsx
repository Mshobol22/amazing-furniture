import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileSignOut from "@/components/account/ProfileSignOut";
import {
  attachZinatexFromPrices,
  isProductCardImageReady,
  mapRowToProduct,
} from "@/lib/supabase/products";
import { shuffleArray } from "@/lib/utils";
import type { Product } from "@/types";

export const metadata: Metadata = {
  title: "Profile",
};

type SeedBucket = {
  wishlistIds: string[];
  cartIds: string[];
  orderIds: string[];
};

function parseOrderProductIds(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const ids: string[] = [];
  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.product_id === "string" && r.product_id) {
      ids.push(r.product_id);
      continue;
    }
    if (r.product && typeof r.product === "object") {
      const p = r.product as Record<string, unknown>;
      if (typeof p.id === "string" && p.id) ids.push(p.id);
    }
  }
  return ids;
}

function parseCartProductIds(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      return typeof r.product_id === "string" ? r.product_id : null;
    })
    .filter((id): id is string => Boolean(id));
}

function selectImageReadyFirst(products: Product[], limit: number): Product[] {
  const unique = products.filter(
    (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx
  );
  const imageReady = unique.filter((p) => isProductCardImageReady(p));
  if (imageReady.length >= limit) {
    return shuffleArray(imageReady).slice(0, limit);
  }
  const remainder = unique.filter((p) => !isProductCardImageReady(p));
  return [...shuffleArray(imageReady), ...shuffleArray(remainder)].slice(0, limit);
}

async function loadPersonalizedProducts(userId: string): Promise<Product[]> {
  const supabase = await createClient();

  const [{ data: wishlistRows }, { data: cartRows }, { data: orderRows }] =
    await Promise.all([
      supabase
        .from("wishlists")
        .select("product_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("carts")
        .select("items, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1),
      supabase
        .from("orders")
        .select("items, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const buckets: SeedBucket = {
    wishlistIds: (wishlistRows ?? [])
      .map((r) => (typeof r.product_id === "string" ? r.product_id : null))
      .filter((id): id is string => Boolean(id)),
    cartIds: (cartRows ?? []).flatMap((r) => parseCartProductIds(r.items)),
    orderIds: (orderRows ?? []).flatMap((r) => parseOrderProductIds(r.items)),
  };

  const seedIds = Array.from(
    new Set([...buckets.wishlistIds, ...buckets.cartIds, ...buckets.orderIds])
  ).slice(0, 80);

  if (seedIds.length === 0) {
    const { data: fallbackRows } = await supabase
      .from("products")
      .select("*")
      .eq("in_stock", true)
      .order("created_at", { ascending: false })
      .limit(6);
    const fallback = (fallbackRows ?? []).map((r) =>
      mapRowToProduct(r as Record<string, unknown>)
    );
    return attachZinatexFromPrices(selectImageReadyFirst(fallback, 6));
  }

  const { data: seedRows } = await supabase
    .from("products")
    .select("*")
    .in("id", seedIds);

  const seedProducts = (seedRows ?? []).map((r) =>
    mapRowToProduct(r as Record<string, unknown>)
  );

  const manufacturers = Array.from(
    new Set(seedProducts.map((p) => p.manufacturer).filter(Boolean))
  ) as string[];
  const categories = Array.from(
    new Set(seedProducts.map((p) => p.category).filter(Boolean))
  );
  const collections = Array.from(
    new Set(seedProducts.map((p) => p.collection).filter(Boolean))
  ) as string[];

  const scored = new Map<string, number>();
  const addScore = (id: string, n: number) => {
    scored.set(id, (scored.get(id) ?? 0) + n);
  };
  for (const id of buckets.wishlistIds) addScore(id, 6);
  for (const id of buckets.cartIds) addScore(id, 4);
  for (const id of buckets.orderIds) addScore(id, 2);

  const rankedSeeds = seedProducts
    .slice()
    .sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0))
    .slice(0, 10);

  let recQuery = supabase
    .from("products")
    .select("*")
    .eq("in_stock", true)
    .limit(120);

  if (manufacturers.length > 0) recQuery = recQuery.in("manufacturer", manufacturers);
  if (categories.length > 0) recQuery = recQuery.in("category", categories);

  const { data: recRows } = await recQuery;
  const recPool = (recRows ?? [])
    .map((r) => mapRowToProduct(r as Record<string, unknown>))
    .filter((p) => !seedIds.includes(p.id));

  const collectionSet = new Set(collections);
  const manufacturerSet = new Set(manufacturers);
  const categorySet = new Set(categories);

  const rankedPool = recPool
    .slice()
    .sort((a, b) => {
      const aScore =
        (a.collection && collectionSet.has(a.collection) ? 4 : 0) +
        (a.manufacturer && manufacturerSet.has(a.manufacturer) ? 2 : 0) +
        (categorySet.has(a.category) ? 1 : 0);
      const bScore =
        (b.collection && collectionSet.has(b.collection) ? 4 : 0) +
        (b.manufacturer && manufacturerSet.has(b.manufacturer) ? 2 : 0) +
        (categorySet.has(b.category) ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    })
    .slice(0, 6);

  const merged = [...rankedPool, ...rankedSeeds]
    .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx)
    .slice(0, 18);

  const primarySelection = selectImageReadyFirst(merged, 6);
  if (primarySelection.length >= 6) {
    return attachZinatexFromPrices(primarySelection);
  }

  const need = 6 - primarySelection.length;
  const { data: fillerRows } = await supabase
    .from("products")
    .select("*")
    .eq("in_stock", true)
    .order("created_at", { ascending: false })
    .limit(40);

  const filler = (fillerRows ?? [])
    .map((r) => mapRowToProduct(r as Record<string, unknown>))
    .filter(
      (p) =>
        !seedIds.includes(p.id) &&
        !primarySelection.some((m) => m.id === p.id) &&
        !merged.some((m) => m.id === p.id)
    );

  const finalSelection = [
    ...primarySelection,
    ...selectImageReadyFirst(filler, need),
  ].slice(0, 6);

  return attachZinatexFromPrices(finalSelection);
}

export default async function AccountProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = headers();
    const path = h.get("x-pathname") ?? "/account/profile";
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Member";
  const initials = displayName
    .split(/\s+/)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const jumpBackProducts = await loadPersonalizedProducts(user.id);

  return (
    <ProfileSignOut
      displayName={displayName}
      email={user.email ?? ""}
      avatarUrl={user.user_metadata?.avatar_url}
      initials={initials}
      jumpBackProducts={jumpBackProducts}
    />
  );
}
