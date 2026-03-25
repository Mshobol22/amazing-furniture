// Uses ANON_KEY (public-facing feed — products are publicly readable)
// NOTE: @supabase/supabase-js is used directly here instead of the SSR
// server client because this utility may be called outside of a
// request context (no cookie store available).
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types";

export interface ReelQueryResult {
  collectionPieces: Product[];
  relatedProducts: Product[];
}

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}

export async function getReelProducts(
  collectionGroup: string,
  category: string,
  limit: number = 20
): Promise<ReelQueryResult> {
  const supabase = getAnonClient();

  // Determine the image filter condition.
  // TODO: Once image validation has been run across all products,
  // remove the `images_validated IS NULL` fallback and query only
  // `images_validated = TRUE` to ensure only confirmed-valid images surface.
  const validatedFilter = (query: ReturnType<typeof supabase.from>) =>
    query
      // Accept fully validated OR not-yet-checked (pre-validation fallback)
      .or("images_validated.eq.true,images_validated.is.null")
      .not("images", "is", null)
      .filter("images", "neq", "{}");

  // Step 1: All pieces from this collection with validated images
  const collectionQuery = supabase
    .from("products")
    .select("*")
    .eq("collection_group", collectionGroup)
    .order("is_collection_hero", { ascending: false })
    .order("piece_type", { ascending: true });

  const { data: collectionPieces, error: collectionError } =
    await validatedFilter(collectionQuery as never);

  if (collectionError) {
    console.error("getReelProducts collection error:", collectionError);
  }

  // Step 2: Related products from same category, different/no collection
  const relatedQuery = supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .or(`collection_group.is.null,collection_group.neq.${collectionGroup}`)
    .eq("in_stock", true)
    .limit(limit);

  // Supabase JS v2 does not support ORDER BY RANDOM() natively;
  // results will be in default insertion order. For true randomness,
  // use a Supabase RPC or shuffle client-side.
  const { data: relatedProducts, error: relatedError } =
    await validatedFilter(relatedQuery as never);

  if (relatedError) {
    console.error("getReelProducts related error:", relatedError);
  }

  return {
    collectionPieces: (collectionPieces as Product[]) ?? [],
    relatedProducts: (relatedProducts as Product[]) ?? [],
  };
}
