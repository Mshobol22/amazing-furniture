import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { canonicalZinatexProductSlug } from "../lib/zinatex-slug";

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
  has_variants: boolean | null;
  variant_type: string | null;
  in_stock: boolean | null;
  price: number | null;
  compare_at_price: number | null;
  color: string | null;
  images: string[] | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  compare_at_price: number | null;
  in_stock: boolean;
  stock_qty: number;
  image_url: string | null;
  sort_order: number | null;
};

type Plan = {
  name: string;
  canonicalId: string;
  canonicalTargetSlug: string | null;
  duplicateIds: string[];
  moveVariantIds: string[];
  insertVariants: Omit<VariantRow, "id" | "product_id">[];
};

async function fetchAllZinatexProducts(): Promise<ProductRow[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: ProductRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,slug,sku,has_variants,variant_type,in_stock,price,compare_at_price,color,images"
      )
      .eq("manufacturer", "Zinatex")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as ProductRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchVariantsForProductIds(productIds: string[]): Promise<VariantRow[]> {
  if (productIds.length === 0) return [];
  const out: VariantRow[] = [];
  const chunk = 200;

  for (let i = 0; i < productIds.length; i += chunk) {
    const slice = productIds.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "id,product_id,sku,size,color,price,compare_at_price,in_stock,stock_qty,image_url,sort_order"
      )
      .in("product_id", slice);
    if (error) throw error;
    out.push(...((data ?? []) as VariantRow[]));
  }

  return out;
}

async function mergeWishlists(canonicalId: string, duplicateIds: string[]) {
  for (const dupId of duplicateIds) {
    const { data: rows, error } = await supabase
      .from("wishlists")
      .select("id,user_id,product_id")
      .eq("product_id", dupId);
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
        await supabase.from("wishlists").update({ product_id: canonicalId }).eq("id", row.id);
      }
    }
  }
}

function remapCartItems(items: unknown, mapOldToNew: Map<string, string>): unknown[] | null {
  if (!Array.isArray(items)) return null;

  const merged = new Map<string, { product_id: string; variant_id?: string; quantity: number }>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const pid = row.product_id;
    const qty = row.quantity;
    const vid = row.variant_id;
    if (typeof pid !== "string" || typeof qty !== "number") continue;

    const nextPid = mapOldToNew.get(pid) ?? pid;
    const variantKey = typeof vid === "string" ? vid : "";
    const key = `${nextPid}:${variantKey}`;
    const prev = merged.get(key);
    if (prev) {
      prev.quantity = Math.min(99, prev.quantity + qty);
    } else {
      merged.set(key, {
        product_id: nextPid,
        variant_id: typeof vid === "string" ? vid : undefined,
        quantity: Math.min(99, Math.max(1, Math.floor(qty))),
      });
    }
  }

  return Array.from(merged.values());
}

async function remapCarts(mapOldToNew: Map<string, string>) {
  if (mapOldToNew.size === 0) return;

  const pageSize = 500;
  let from = 0;
  for (;;) {
    const { data: carts, error } = await supabase
      .from("carts")
      .select("id,items")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = carts ?? [];

    for (const cart of batch) {
      const items = cart.items as unknown;
      if (!Array.isArray(items)) continue;
      const needsUpdate = items.some((it) => {
        const row = it as Record<string, unknown>;
        return typeof row.product_id === "string" && mapOldToNew.has(row.product_id);
      });
      if (!needsUpdate) continue;
      const next = remapCartItems(items, mapOldToNew);
      if (!next) continue;
      await supabase.from("carts").update({ items: next }).eq("id", cart.id);
    }

    if (batch.length < pageSize) break;
    from += pageSize;
  }
}

function chooseCanonical(rows: ProductRow[], variantsByProduct: Map<string, VariantRow[]>): ProductRow {
  const withScore = rows.map((p) => ({
    row: p,
    variantCount: (variantsByProduct.get(p.id) ?? []).length,
  }));

  withScore.sort((a, b) => {
    if (b.variantCount !== a.variantCount) return b.variantCount - a.variantCount;
    if (a.row.has_variants !== b.row.has_variants) return a.row.has_variants ? -1 : 1;
    if (a.row.in_stock !== b.row.in_stock) return a.row.in_stock ? -1 : 1;
    return a.row.id.localeCompare(b.row.id);
  });

  return withScore[0]!.row;
}

function shouldCreateVariantFromStandaloneSku(sku: string | null | undefined): boolean {
  if (!sku) return false;
  const v = sku.trim();
  if (!v) return false;
  return !v.toLowerCase().endsWith("-standalone");
}

function buildPlans(products: ProductRow[], variants: VariantRow[]): Plan[] {
  const byName = new Map<string, ProductRow[]>();
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(p);
    byName.set(key, list);
  }

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const plans: Plan[] = [];
  for (const rows of byName.values()) {
    if (rows.length < 2) continue;

    const hasVariantParent = rows.some((r) => r.has_variants === true);
    const hasStandalone = rows.some((r) => r.has_variants === false);
    if (!hasVariantParent || !hasStandalone) continue;

    const canonical = chooseCanonical(rows, variantsByProduct);
    const duplicates = rows.filter((r) => r.id !== canonical.id);
    const canonicalVariantSkus = new Set(
      (variantsByProduct.get(canonical.id) ?? []).map((v) => v.sku.trim().toLowerCase())
    );

    const moveVariantIds: string[] = [];
    const insertVariants: Omit<VariantRow, "id" | "product_id">[] = [];
    for (const dup of duplicates) {
      const dupVars = variantsByProduct.get(dup.id) ?? [];
      for (const v of dupVars) {
        const skuKey = v.sku.trim().toLowerCase();
        if (canonicalVariantSkus.has(skuKey)) {
          continue;
        }
        moveVariantIds.push(v.id);
        canonicalVariantSkus.add(skuKey);
      }

      if (shouldCreateVariantFromStandaloneSku(dup.sku)) {
        const skuKey = dup.sku!.trim().toLowerCase();
        if (!canonicalVariantSkus.has(skuKey)) {
          insertVariants.push({
            sku: dup.sku!,
            size: null,
            color: dup.color ?? null,
            price: Number(dup.price ?? 0),
            compare_at_price: dup.compare_at_price ?? null,
            in_stock: dup.in_stock !== false,
            stock_qty: 0,
            image_url: Array.isArray(dup.images) && dup.images[0] ? dup.images[0] : null,
            sort_order: 99,
          });
          canonicalVariantSkus.add(skuKey);
        }
      }
    }

    const sampleVariantSku =
      (variantsByProduct.get(canonical.id) ?? [])[0]?.sku ??
      insertVariants[0]?.sku ??
      canonical.sku ??
      "";
    const canonicalTargetSlug = sampleVariantSku
      ? canonicalZinatexProductSlug(canonical.name, sampleVariantSku)
      : null;

    plans.push({
      name: canonical.name,
      canonicalId: canonical.id,
      canonicalTargetSlug,
      duplicateIds: duplicates.map((d) => d.id),
      moveVariantIds,
      insertVariants,
    });
  }

  plans.sort((a, b) => a.name.localeCompare(b.name));
  return plans;
}

async function main() {
  console.log(`remove-zinatex-duplicate-pages DRY_RUN=${DRY_RUN}\n`);

  const products = await fetchAllZinatexProducts();
  const variants = await fetchVariantsForProductIds(products.map((p) => p.id));
  const plans = buildPlans(products, variants);

  console.log(`Duplicate groups to consolidate: ${plans.length}`);
  for (const p of plans) {
    console.log(
      `- ${p.name} | keep=${p.canonicalId} | delete=${p.duplicateIds.length} | moveVariants=${p.moveVariantIds.length} | addVariants=${p.insertVariants.length}`
    );
  }
  console.log("");

  if (DRY_RUN) {
    console.log("Done (dry run — no DB writes).");
    return;
  }

  const remap = new Map<string, string>();
  for (const p of plans) {
    for (const d of p.duplicateIds) remap.set(d, p.canonicalId);
  }

  for (const p of plans) {
    await mergeWishlists(p.canonicalId, p.duplicateIds);

    if (p.moveVariantIds.length > 0) {
      const chunk = 100;
      for (let i = 0; i < p.moveVariantIds.length; i += chunk) {
        const ids = p.moveVariantIds.slice(i, i + chunk);
        const { error } = await supabase
          .from("product_variants")
          .update({ product_id: p.canonicalId })
          .in("id", ids);
        if (error) throw error;
      }
    }

    if (p.insertVariants.length > 0) {
      const rows = p.insertVariants.map((v) => ({
        ...v,
        product_id: p.canonicalId,
      }));
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error) throw error;
    }

    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .in("id", p.duplicateIds);
    if (delErr) throw delErr;

    const updatePayload: Record<string, unknown> = {
      has_variants: true,
      variant_type: "rug",
    };
    if (p.canonicalTargetSlug) {
      const { data: slugConflict, error: slugErr } = await supabase
        .from("products")
        .select("id")
        .eq("slug", p.canonicalTargetSlug)
        .neq("id", p.canonicalId)
        .maybeSingle();
      if (slugErr) throw slugErr;
      if (!slugConflict) {
        updatePayload.slug = p.canonicalTargetSlug;
      }
    }
    const { error: upErr } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", p.canonicalId);
    if (upErr) throw upErr;
  }

  await remapCarts(remap);

  console.log(`Done. Consolidated ${plans.length} duplicate groups.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
