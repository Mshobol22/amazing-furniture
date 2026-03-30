import Link from "next/link";
import DiscoverReel from "@/components/reel/DiscoverReel";
import { createClient } from "@/lib/supabase/server";
import {
  applyAcmeComponentListingFilter,
  applyZinatexListingVisibilityFilter,
  attachZinatexFromPrices,
  isHiddenFromProductListingByImage,
  mapRowToProduct,
} from "@/lib/supabase/products";
import type { Product } from "@/types";

type DiscoverResponse = {
  products: Product[];
  nextCursor: number | null;
};

function seededSortValue(id: string, seed: number): number {
  let hash = 0;
  const source = `${id}${seed}`;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash % 9999;
}

async function getInitialDiscoverPayload(seed: number): Promise<DiscoverResponse> {
  const LIMIT = 20;
  const supabase = await createClient();
  // select("*") so DiscoverReel gets UF + Zinatex fields (collection, subcategory, name, …) via mapRowToProduct
  let baseQuery = supabase
    .from("products")
    .select("*")
    .eq("in_stock", true)
    .not("images", "is", null)
    .not("images", "eq", "{}")
    .or("images_validated.eq.true,images_validated.is.null");
  baseQuery = applyZinatexListingVisibilityFilter(baseQuery);
  baseQuery = applyAcmeComponentListingFilter(baseQuery);

  const { data, error } = await baseQuery;

  if (error) throw error;

  const matchingRows = (data ?? []).filter((row) => {
    if (!Array.isArray(row.images) || row.images.length === 0) return false;
    const p = mapRowToProduct(row as Record<string, unknown>);
    return !isHiddenFromProductListingByImage(p);
  });

  const orderedRows = [...matchingRows].sort((a, b) => {
    const diff =
      seededSortValue(String(a.id), seed) - seededSortValue(String(b.id), seed);
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  });

  const pagedRows = orderedRows.slice(0, LIMIT);
  const nextCursor = pagedRows.length < orderedRows.length ? pagedRows.length : null;

  const mapped = pagedRows.map((row) =>
    mapRowToProduct(row as Record<string, unknown>)
  );
  const products = await attachZinatexFromPrices(mapped);

  return {
    products,
    nextCursor,
  };
}

export default async function DiscoverPage() {
  const seed = Math.floor(Math.random() * 99999);
  let payload: DiscoverResponse | null = null;
  let error: string | null = null;

  try {
    payload = await getInitialDiscoverPayload(seed);
  } catch (e) {
    console.error("Discover SSR load error:", e);
    error = "Unable to load discover feed right now.";
  }

  return (
    <div className="fixed inset-0 z-30 bg-black md:bg-[#111]">
      <div className="relative h-screen w-[100vw] md:w-full md:max-w-[480px] md:mx-auto">
        <Link
          href="/"
          className="absolute left-4 top-4 z-[60] rounded-full bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3B5E4F]"
        >
          ← Back
        </Link>

        {error || !payload ? (
          <div className="flex h-screen w-full flex-col items-center justify-center gap-3 px-4 text-center text-white/90">
            <p>{error ?? "Unable to load discover feed right now."}</p>
            <Link
              href="/"
              className="rounded-md bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white"
            >
              Return home
            </Link>
          </div>
        ) : (
          <DiscoverReel
            initialProducts={payload.products}
            initialNextCursor={payload.nextCursor}
            seed={seed}
          />
        )}
      </div>
    </div>
  );
}
