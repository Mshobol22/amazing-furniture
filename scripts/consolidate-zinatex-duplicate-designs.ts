/**
 * Merge duplicate Zinatex PDP rows that share the same numeric design key after `-ztx-`
 * (e.g. ...-ztx-11301 and ...-ztx-11301-turquoise-4x6).
 *
 * - Picks canonical parent = among all rows in the merge set, the one with the most
 *   product_variants for that design (tiebreak: slug already equals canonical slug, then id).
 * - Merge set = union of: products whose slug starts with `-ztx-{digits}` for that key (when
 *   the slug group has 2+ rows), and any product that holds a variant SKU with that numeric key.
 * - Points ALL variants whose SKU style key matches that design at canonical.
 * - Sets has_variants=true, variant_type='rug', slug = canonical parent URL.
 * - Merges wishlists and cart line product_id references, then deletes duplicate product rows.
 *
 * Only numeric design keys (3+ digits), same safety as fix-zinatex-orphan-parents.
 *
 * Run: DRY_RUN=true  npx tsx scripts/consolidate-zinatex-duplicate-designs.ts
 *      DRY_RUN=false npx tsx scripts/consolidate-zinatex-duplicate-designs.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  canonicalZinatexProductSlug,
  zinatexStyleKeyFromVariationSku,
} from "../lib/zinatex-slug";

const DRY_RUN = process.env.DRY_RUN !== "false";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(url, key);

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
};

type VariantRow = { id: string; product_id: string; sku: string };

/** First run of digits immediately after `-ztx-` (e.g. 11301 from ...-ztx-11301-turquoise-...). */
function numericDesignKeyFromZinatexSlug(slug: string): string | null {
  const marker = "-ztx-";
  const i = slug.indexOf(marker);
  if (i === -1) return null;
  const after = slug.slice(i + marker.length);
  const m = after.match(/^(\d+)/);
  if (!m) return null;
  const k = m[1];
  return k.length >= 3 ? k : null;
}

function variantDesignKey(sku: string): string | null {
  const k = zinatexStyleKeyFromVariationSku(sku);
  return /^\d{3,}$/.test(k) ? k : null;
}

async function fetchAllZinatexProducts(): Promise<ProductRow[]> {
  const out: ProductRow[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, sku")
      .eq("manufacturer", "Zinatex")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    out.push(...(batch as ProductRow[]));
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function fetchVariantsForProductIds(productIds: string[]): Promise<VariantRow[]> {
  if (productIds.length === 0) return [];
  const out: VariantRow[] = [];
  const chunk = 200;
  for (let i = 0; i < productIds.length; i += chunk) {
    const slice = productIds.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, product_id, sku")
      .in("product_id", slice);
    if (error) throw error;
    out.push(...((data ?? []) as VariantRow[]));
  }
  return out;
}

async function mergeWishlists(canonicalId: string, duplicateIds: string[]) {
  for (const dup of duplicateIds) {
    const { data: rows, error } = await supabase
      .from("wishlists")
      .select("id, user_id, product_id")
      .eq("product_id", dup);
    if (error) throw error;
    for (const row of rows ?? []) {
      const { data: existing } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("product_id", canonicalId)
        .maybeSingle();
      if (existing) {
        await supabase.from("wishlists").delete().eq("id", row.id);
      } else {
        await supabase
          .from("wishlists")
          .update({ product_id: canonicalId })
          .eq("id", row.id);
      }
    }
  }
}

function remapCartItems(
  items: unknown,
  mapOldToNew: Map<string, string>
): unknown[] | null {
  if (!Array.isArray(items)) return null;
  const merged = new Map<string, { product_id: string; variant_id?: string; quantity: number }>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const pid = it.product_id;
    const qty = it.quantity;
    const vid = it.variant_id;
    if (typeof pid !== "string" || typeof qty !== "number") continue;
    const newPid = mapOldToNew.get(pid) ?? pid;
    const vkey = typeof vid === "string" ? vid : "";
    const lineKey = `${newPid}:${vkey}`;
    const prev = merged.get(lineKey);
    if (prev) {
      prev.quantity = Math.min(99, prev.quantity + qty);
    } else {
      merged.set(lineKey, {
        product_id: newPid,
        variant_id: typeof vid === "string" ? vid : undefined,
        quantity: Math.min(99, Math.max(1, Math.floor(qty))),
      });
    }
  }
  return Array.from(merged.values());
}

async function remapCartsForDuplicates(mapOldToNew: Map<string, string>) {
  if (mapOldToNew.size === 0) return;

  const pageSize = 500;
  let from = 0;
  for (;;) {
    const { data: carts, error } = await supabase
      .from("carts")
      .select("id, items")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = carts ?? [];
    for (const cart of batch) {
      const items = cart.items as unknown;
      if (!Array.isArray(items)) continue;
      const needs = items.some((it) => {
        const o = it as Record<string, unknown>;
        return typeof o.product_id === "string" && mapOldToNew.has(o.product_id);
      });
      if (!needs) continue;
      const next = remapCartItems(items, mapOldToNew);
      if (!next) continue;
      await supabase.from("carts").update({ items: next }).eq("id", cart.id);
    }
    if (batch.length < pageSize) break;
    from += pageSize;
  }
}

type Plan = {
  designKey: string;
  canonicalId: string;
  duplicateIds: string[];
  targetSlug: string;
  variantIds: string[];
};

function buildPlans(
  products: ProductRow[],
  allVariants: VariantRow[]
): Plan[] {
  const byId = new Map(products.map((p) => [p.id, p]));

  const slugGroupByDesign = new Map<string, string[]>();
  for (const p of products) {
    const k = numericDesignKeyFromZinatexSlug(p.slug);
    if (!k) continue;
    const list = slugGroupByDesign.get(k) ?? [];
    list.push(p.id);
    slugGroupByDesign.set(k, list);
  }

  const parentsByDesign = new Map<string, Set<string>>();
  for (const v of allVariants) {
    const dk = variantDesignKey(v.sku);
    if (!dk) continue;
    if (!parentsByDesign.has(dk)) parentsByDesign.set(dk, new Set());
    parentsByDesign.get(dk)!.add(v.product_id);
  }

  const designsToFix = new Set<string>();
  for (const [k, ids] of Array.from(slugGroupByDesign.entries())) {
    if (ids.length >= 2) designsToFix.add(k);
  }
  for (const [k, set] of Array.from(parentsByDesign.entries())) {
    if (set.size >= 2) designsToFix.add(k);
  }

  const plans: Plan[] = [];
  const sortedKeys = Array.from(designsToFix).sort((a, b) => Number(a) - Number(b));

  for (const designKey of sortedKeys) {
    const fromSlug = slugGroupByDesign.get(designKey) ?? [];
    const fromVar = Array.from(parentsByDesign.get(designKey) ?? []);
    const productIds = Array.from(new Set(fromSlug.concat(fromVar)));
    if (productIds.length < 2) continue;

    const variantsForDesign = allVariants.filter(
      (v) => variantDesignKey(v.sku) === designKey
    );
    if (variantsForDesign.length === 0) continue;

    const variantCount = new Map<string, number>();
    for (const id of productIds) variantCount.set(id, 0);
    for (const v of variantsForDesign) {
      variantCount.set(v.product_id, (variantCount.get(v.product_id) ?? 0) + 1);
    }

    const best = Math.max(...productIds.map((id) => variantCount.get(id) ?? 0));
    const top = productIds.filter((id) => (variantCount.get(id) ?? 0) === best);
    const sampleSku =
      variantsForDesign[0]?.sku ?? `${designKey}-Grey-4x6`;

    let canonicalId = top.sort()[0]!;
    for (const id of top) {
      const row = byId.get(id);
      if (!row) continue;
      const wantSlug = canonicalZinatexProductSlug(row.name, sampleSku);
      if (row.slug === wantSlug) {
        canonicalId = id;
        break;
      }
    }

    const sampleSkuForSlug =
      variantsForDesign.find((v) => v.product_id === canonicalId)?.sku ??
      sampleSku;
    const canonicalRow = byId.get(canonicalId);
    if (!canonicalRow) continue;

    const targetSlug = canonicalZinatexProductSlug(
      canonicalRow.name,
      sampleSkuForSlug
    );
    const duplicateIds = productIds.filter((id) => id !== canonicalId);

    plans.push({
      designKey,
      canonicalId,
      duplicateIds,
      targetSlug,
      variantIds: variantsForDesign.map((v) => v.id),
    });
  }

  return plans;
}

async function main() {
  console.log(`consolidate-zinatex-duplicate-designs DRY_RUN=${DRY_RUN}\n`);

  const products = await fetchAllZinatexProducts();
  const zIds = products.map((p) => p.id);
  const allVariants = await fetchVariantsForProductIds(zIds);

  const plans = buildPlans(products, allVariants);
  console.log(`Consolidation plans: ${plans.length}\n`);

  const fullMap = new Map<string, string>();
  for (const p of plans) {
    for (const d of p.duplicateIds) {
      if (fullMap.has(d) && fullMap.get(d) !== p.canonicalId) {
        throw new Error(
          `Product ${d} marked duplicate in two groups (${fullMap.get(d)} vs ${p.canonicalId})`
        );
      }
      fullMap.set(d, p.canonicalId);
    }
  }

  for (const p of plans) {
    console.log(
      `[ztx-${p.designKey}] canonical=${p.canonicalId} → slug ${p.targetSlug} | variants=${p.variantIds.length} | delete ${p.duplicateIds.length} row(s)`
    );
    console.log(`  remove: ${p.duplicateIds.join(", ")}`);
  }

  if (DRY_RUN) {
    console.log(`\nDone (dry run — no DB writes).`);
    return;
  }

  for (const p of plans) {
    await mergeWishlists(p.canonicalId, p.duplicateIds);
  }
  await remapCartsForDuplicates(fullMap);

  const vChunk = 100;
  for (const p of plans) {
    for (let i = 0; i < p.variantIds.length; i += vChunk) {
      const { error } = await supabase
        .from("product_variants")
        .update({ product_id: p.canonicalId })
        .in("id", p.variantIds.slice(i, i + vChunk));
      if (error) throw error;
    }

    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .in("id", p.duplicateIds);
    if (delErr) throw delErr;

    const { error: upErr } = await supabase
      .from("products")
      .update({
        has_variants: true,
        variant_type: "rug",
        slug: p.targetSlug,
      })
      .eq("id", p.canonicalId);
    if (upErr) throw upErr;
  }

  console.log(`\nDone. Applied ${plans.length} group(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
