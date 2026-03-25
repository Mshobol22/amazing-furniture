import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProductRow = {
  id: string;
  sku: string | null;
  manufacturer: string | null;
  collection_group: string | null;
  piece_type: string | null;
  is_collection_hero: boolean | null;
  bundle_skus: string[] | null;
};

type ProductUpdate = {
  id: string;
  collection_group: string;
  piece_type: string;
  is_collection_hero: boolean;
  bundle_skus: string[];
};

const NFD_SUFFIXES: Array<{
  suffix: string;
  pieceType: string;
  isCollectionHero?: boolean;
}> = [
  { suffix: "TLB", pieceType: "Twin Loft Bed" },
  { suffix: "KB", pieceType: "King Bed", isCollectionHero: true },
  { suffix: "QB", pieceType: "Queen Bed" },
  { suffix: "FB", pieceType: "Full Bed" },
  { suffix: "TB", pieceType: "Twin Bed" },
  { suffix: "NS", pieceType: "Nightstand" },
  { suffix: "HB", pieceType: "Headboard" },
  { suffix: "BR", pieceType: "Bed Rail" },
  { suffix: "CS", pieceType: "Chest" },
  { suffix: "OC", pieceType: "Ottoman/Chest" },
  { suffix: "D", pieceType: "Dresser" },
  { suffix: "M", pieceType: "Mirror" },
  { suffix: "C", pieceType: "Chest" },
  { suffix: "N", pieceType: "Nightstand" },
  { suffix: "W", pieceType: "Wardrobe" },
];

const UNITED_SINGLE_SUFFIXES: Record<string, string> = {
  K: "King Bed",
  Q: "Queen Bed",
  F: "Full Bed",
  T: "Twin Bed",
  D: "Dresser",
  M: "Mirror",
  C: "Chest",
  N: "Nightstand",
  NS: "Nightstand",
  W: "Wardrobe",
  HB: "Headboard",
};

const UNITED_KNOWN_BUNDLES: Record<string, string> = {
  KDM: "King Bed + Dresser + Mirror Bundle",
  QDM: "Queen Bed + Dresser + Mirror Bundle",
  KDMCN: "King Bed + Dresser + Mirror + Chest + Nightstand Bundle",
  QDMCN: "Queen Bed + Dresser + Mirror + Chest + Nightstand Bundle",
  KDMN: "King Bed + Dresser + Mirror + Nightstand Bundle",
  QDMN: "Queen Bed + Dresser + Mirror + Nightstand Bundle",
};

function normalizeSku(rawSku: string): string {
  return rawSku.trim().toUpperCase();
}

function parseNfdSku(rawSku: string): Omit<ProductUpdate, "id"> | null {
  const sku = normalizeSku(rawSku).replace(/[\s-]/g, "");
  for (const rule of NFD_SUFFIXES) {
    if (!sku.endsWith(rule.suffix)) continue;
    const group = sku.slice(0, -rule.suffix.length);
    if (!group) return null;
    return {
      collection_group: group,
      piece_type: rule.pieceType,
      is_collection_hero: Boolean(rule.isCollectionHero),
      bundle_skus: [],
    };
  }
  return null;
}

function parseUnitedSku(rawSku: string): Omit<ProductUpdate, "id"> | null {
  const sku = normalizeSku(rawSku);
  const splitIndex = sku.indexOf("-");
  if (splitIndex <= 0 || splitIndex >= sku.length - 1) return null;

  const group = sku.slice(0, splitIndex).trim();
  const suffix = sku.slice(splitIndex + 1).trim();
  if (!group || !suffix) return null;

  if (UNITED_SINGLE_SUFFIXES[suffix]) {
    return {
      collection_group: group,
      piece_type: UNITED_SINGLE_SUFFIXES[suffix],
      is_collection_hero: false,
      bundle_skus: [],
    };
  }

  const isBundleHero =
    suffix.length >= 3 &&
    /^[A-Z]+$/.test(suffix);
  if (!isBundleHero) return null;

  return {
    collection_group: group,
    piece_type: UNITED_KNOWN_BUNDLES[suffix] ?? `${suffix} Bundle`,
    is_collection_hero: true,
    bundle_skus: [],
  };
}

async function fetchUntypedProducts(manufacturer: string): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, manufacturer, collection_group, piece_type, is_collection_hero, bundle_skus")
    .eq("manufacturer", manufacturer)
    .or("collection_group.is.null,collection_group.eq.");

  if (error) {
    throw new Error(`Failed to fetch ${manufacturer} products: ${error.message}`);
  }

  return (data ?? []) as ProductRow[];
}

async function applyUpdatesInBatches(updates: ProductUpdate[], batchSize = 100): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (update) => {
        const { id, ...patch } = update;
        const { error } = await supabase
          .from("products")
          .update(patch)
          .eq("id", id);
        if (error) {
          throw new Error(`Update failed for product ${id}: ${error.message}`);
        }
      })
    );
    console.log(`Updated ${Math.min(i + batch.length, updates.length)} / ${updates.length}`);
  }
}

async function setNfdHeroBundles(): Promise<number> {
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, collection_group, piece_type, is_collection_hero")
    .eq("manufacturer", "Nationwide FD")
    .not("collection_group", "is", null);

  if (error) throw new Error(`Failed to fetch NFD grouped products: ${error.message}`);

  const rows = (data ?? []) as ProductRow[];
  const byGroup = new Map<string, ProductRow[]>();
  for (const row of rows) {
    const group = row.collection_group?.trim();
    if (!group) continue;
    const existing = byGroup.get(group) ?? [];
    existing.push(row);
    byGroup.set(group, existing);
  }

  let heroCount = 0;
  const heroPriority = ["King Bed", "Queen Bed", "Full Bed"];

  for (const [group, groupRows] of Array.from(byGroup.entries())) {
    const allSkus = groupRows.map((r) => r.sku).filter((sku): sku is string => Boolean(sku));
    if (allSkus.length === 0) continue;

    let hero: ProductRow | undefined;
    for (const pieceType of heroPriority) {
      hero = groupRows.find((r) => r.piece_type === pieceType);
      if (hero) break;
    }
    if (!hero) continue;

    const { error: updateError } = await supabase
      .from("products")
      .update({ is_collection_hero: true, bundle_skus: allSkus })
      .eq("id", hero.id);
    if (updateError) {
      throw new Error(`Failed to set NFD hero bundle for group ${group}: ${updateError.message}`);
    }
    heroCount += 1;
  }

  return heroCount;
}

async function setUnitedHeroBundles(): Promise<number> {
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, collection_group, piece_type, is_collection_hero")
    .eq("manufacturer", "United Furniture")
    .not("collection_group", "is", null);

  if (error) throw new Error(`Failed to fetch United grouped products: ${error.message}`);

  const rows = (data ?? []) as ProductRow[];
  const byGroup = new Map<string, ProductRow[]>();
  for (const row of rows) {
    const group = row.collection_group?.trim();
    if (!group) continue;
    const existing = byGroup.get(group) ?? [];
    existing.push(row);
    byGroup.set(group, existing);
  }

  let heroCount = 0;
  for (const groupRows of Array.from(byGroup.values())) {
    const heroRows = groupRows.filter((r) => Boolean(r.is_collection_hero));
    if (heroRows.length === 0) continue;

    const individualPieceSkus = groupRows
      .map((row) => row.sku)
      .filter((sku): sku is string => Boolean(sku))
      .filter((sku) => {
        const normalized = normalizeSku(sku);
        const splitIndex = normalized.indexOf("-");
        if (splitIndex <= 0 || splitIndex >= normalized.length - 1) return false;
        const suffix = normalized.slice(splitIndex + 1);
        return suffix.length === 1 && /^[A-Z]$/.test(suffix);
      });

    if (individualPieceSkus.length === 0) continue;

    for (const hero of heroRows) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ bundle_skus: individualPieceSkus })
        .eq("id", hero.id);
      if (updateError) {
        throw new Error(`Failed setting United bundle SKUs for ${hero.id}: ${updateError.message}`);
      }
      heroCount += 1;
    }
  }

  return heroCount;
}

async function main() {
  const nfdProducts = await fetchUntypedProducts("Nationwide FD");
  const nfdUpdates: ProductUpdate[] = [];
  let nfdSkipped = 0;

  for (const product of nfdProducts) {
    if (!product.sku) {
      nfdSkipped += 1;
      continue;
    }
    const parsed = parseNfdSku(product.sku);
    if (!parsed) {
      nfdSkipped += 1;
      continue;
    }
    nfdUpdates.push({ id: product.id, ...parsed });
  }

  await applyUpdatesInBatches(nfdUpdates);
  console.log(`NFD: ${nfdUpdates.length} products tagged, ${nfdSkipped} skipped`);

  const unitedProducts = await fetchUntypedProducts("United Furniture");
  const unitedUpdates: ProductUpdate[] = [];
  let unitedSkipped = 0;

  for (const product of unitedProducts) {
    if (!product.sku) {
      unitedSkipped += 1;
      continue;
    }
    const parsed = parseUnitedSku(product.sku);
    if (!parsed) {
      unitedSkipped += 1;
      continue;
    }
    unitedUpdates.push({ id: product.id, ...parsed });
  }

  await applyUpdatesInBatches(unitedUpdates);
  console.log(`United: ${unitedUpdates.length} products tagged, ${unitedSkipped} skipped`);

  const nfdHeroCount = await setNfdHeroBundles();
  const unitedHeroCount = await setUnitedHeroBundles();
  console.log(`Bundle SKUs set for ${nfdHeroCount + unitedHeroCount} heroes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
