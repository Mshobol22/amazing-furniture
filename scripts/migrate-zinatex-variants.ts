/**
 * Zinatex Variant Migration
 *
 * Migrates flat Zinatex product rows into a parent + product_variants model.
 *
 * GHOST ROWS  (sku === name, 148 total)
 *   - Assign a proper SKU: slugify(name) + "-standalone"
 *   - Set has_variants = false
 *   - Leave all other fields untouched
 *
 * REAL ROWS  (sku !== name)
 *   - Group by name
 *   - 1 row  → set has_variants = false, no SKU change
 *   - 2+ rows → pick parent (most images; tiebreak lowest price),
 *               set has_variants = true + variant_type = 'rug' on parent,
 *               INSERT one product_variants row per group member,
 *               DELETE non-parent rows from products
 *
 * IDEMPOTENT: groups whose parent_id already has product_variants rows are skipped.
 *
 * NOTE ON TRANSACTIONS: The Supabase JS client does not support multi-statement
 * transactions. Each group's writes (insert → update → delete) are performed
 * sequentially. If a step fails mid-group, the error is logged and the script
 * continues. Re-running the script is safe — the idempotency check will skip any
 * group whose variants were already inserted.
 *
 * Run:
 *   DRY_RUN=true  npx ts-node scripts/migrate-zinatex-variants.ts
 *   DRY_RUN=false npx ts-node scripts/migrate-zinatex-variants.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN !== "false";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Types ───────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  color: string | null;
  price: number;
  compare_at_price: number | null;
  in_stock: boolean;
  images: string[];
  has_variants: boolean;
  variant_type: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Slugify rules:
 *   lowercase → replace & with - → replace spaces with - →
 *   strip non-alphanumeric/hyphen → collapse consecutive hyphens → trim hyphens
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract the last hyphen-segment of a SKU as the raw size code.
 * e.g. "JERICHO-RUG-10x13" → "10x13"
 */
function extractRawSize(sku: string): string {
  const parts = sku.split("-");
  return parts[parts.length - 1] ?? "";
}

/**
 * Normalise a raw size token.
 * e.g. "7ftRound" → "7ft Round"  |  "10x13" → "10x13" (unchanged)
 */
function normalizeSize(raw: string): string {
  return raw.replace(/(\d+ft)([A-Z])/g, "$1 $2");
}

const SIZE_ORDER: Record<string, number> = {
  "2x4":       1,
  "2x8":       2,
  "4x6":       3,
  "5x8":       4,
  "7ft Round": 5,
  "7x10":      6,
  "8x11":      7,
  "10x13":     8,
};

function getSortOrder(size: string): number {
  return SIZE_ORDER[size] ?? 99;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(
    `\n🔧 Zinatex Variant Migration — DRY_RUN=${DRY_RUN}`
  );
  console.log("=".repeat(60));

  // ── Fetch all Zinatex products ──────────────────────────────────────────
  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select(
      "id, name, sku, color, price, compare_at_price, in_stock, images, has_variants, variant_type"
    )
    .eq("manufacturer", "Zinatex");

  if (fetchError) {
    console.error("ERROR: Failed to fetch products:", fetchError.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("No Zinatex products found in database.");
    return;
  }

  // ── Fetch already-migrated product IDs ─────────────────────────────────
  const { data: existingVariantRows, error: variantFetchError } =
    await supabase.from("product_variants").select("product_id");

  if (variantFetchError) {
    console.error(
      "ERROR: Failed to fetch product_variants:",
      variantFetchError.message
    );
    process.exit(1);
  }

  const migratedIds = new Set<string>(
    (existingVariantRows ?? []).map((v: { product_id: string }) => v.product_id)
  );

  // ── Classify rows ───────────────────────────────────────────────────────
  const ghostRows: ProductRow[] = [];
  const realRows:  ProductRow[] = [];

  for (const p of products as ProductRow[]) {
    if (p.sku === p.name) {
      ghostRows.push(p);
    } else {
      realRows.push(p);
    }
  }

  console.log(`\nTotal Zinatex products: ${products.length}`);
  console.log(`  Ghost rows (sku = name): ${ghostRows.length}`);
  console.log(`  Real rows  (sku ≠ name): ${realRows.length}`);
  console.log("");

  // ── Stats ───────────────────────────────────────────────────────────────
  let ghostFixed          = 0;
  let variantGroups       = 0;
  let variantsInserted    = 0;
  let singleRowDesigns    = 0;
  let errors              = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // GHOST ROWS — fix SKU, mark has_variants = false
  // ══════════════════════════════════════════════════════════════════════════

  for (const ghost of ghostRows) {
    // Safety guard: if somehow sku was already fixed, skip
    if (ghost.sku !== ghost.name) {
      continue;
    }

    const newSku = `${slugify(ghost.name)}-standalone`;

    if (DRY_RUN) {
      console.log(`[GHOST-FIX]  "${ghost.name}" → new sku: "${newSku}"`);
      ghostFixed++;
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({ sku: newSku, has_variants: false })
      .eq("id", ghost.id);

    if (error) {
      console.error(`[ERROR]      "${ghost.name}" → ghost SKU fix: ${error.message}`);
      errors++;
    } else {
      console.log(`[GHOST-FIX]  "${ghost.name}" → new sku: "${newSku}"`);
      ghostFixed++;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REAL ROWS — group by name
  // ══════════════════════════════════════════════════════════════════════════

  const groups = new Map<string, ProductRow[]>();
  for (const p of realRows) {
    const bucket = groups.get(p.name) ?? [];
    bucket.push(p);
    groups.set(p.name, bucket);
  }

  for (const [name, group] of Array.from(groups.entries())) {

    // ── Single-row group — no variants needed ──────────────────────────────
    if (group.length === 1) {
      const p = group[0];
      singleRowDesigns++;

      if (p.has_variants === false) {
        // Already correct — nothing to do
        continue;
      }

      if (DRY_RUN) {
        continue;
      }

      await supabase
        .from("products")
        .update({ has_variants: false })
        .eq("id", p.id);

      continue;
    }

    // ── Multi-row group — pick parent, build variants ──────────────────────

    // Sort: most images first, tiebreak lowest price
    const sorted = [...group].sort((a, b) => {
      const aImgs = (a.images ?? []).length;
      const bImgs = (b.images ?? []).length;
      if (bImgs !== aImgs) return bImgs - aImgs;
      return a.price - b.price;
    });

    const parent    = sorted[0];
    const nonParent = sorted.slice(1);

    // Idempotency check
    if (migratedIds.has(parent.id)) {
      console.log(`[SKIP]       "${name}" → already migrated`);
      continue;
    }

    try {
      // Build variant insert rows
      const variantRows = group.map((p: ProductRow) => {
        const raw  = extractRawSize(p.sku);
        const size = normalizeSize(raw);
        return {
          product_id:       parent.id,
          sku:              p.sku,
          size,
          color:            p.color ?? null,
          price:            p.price,
          compare_at_price: p.compare_at_price ?? null,
          in_stock:         p.in_stock,
          stock_qty:        0,
          image_url:        (p.images ?? [])[0] ?? null,
          sort_order:       getSortOrder(size),
        };
      });

      const sizeList = variantRows.map((v: { size: string }) => v.size).join(", ");

      if (DRY_RUN) {
        console.log(
          `[VARIANT]    "${name}" → parent: ${parent.id}, variants: ${group.length} (${sizeList})`
        );
        variantGroups++;
        variantsInserted += group.length;
        continue;
      }

      // Step 1: Insert all variants
      const { error: insertErr } = await supabase
        .from("product_variants")
        .insert(variantRows);

      if (insertErr) {
        throw new Error(`insert variants: ${insertErr.message}`);
      }

      // Step 2: Mark parent
      const { error: updateErr } = await supabase
        .from("products")
        .update({ has_variants: true, variant_type: "rug" })
        .eq("id", parent.id);

      if (updateErr) {
        throw new Error(`update parent: ${updateErr.message}`);
      }

      // Step 3: Delete non-parent product rows
      if (nonParent.length > 0) {
        const idsToDelete = nonParent.map((p) => p.id);

        const { error: deleteErr } = await supabase
          .from("products")
          .delete()
          .in("id", idsToDelete);

        if (deleteErr) {
          throw new Error(`delete non-parent rows: ${deleteErr.message}`);
        }
      }

      console.log(
        `[VARIANT]    "${name}" → parent: ${parent.id}, variants: ${group.length} (${sizeList})`
      );
      variantGroups++;
      variantsInserted += group.length;

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR]      "${name}" → ${msg}`);
      errors++;
    }
  }

  // ── Final summary ────────────────────────────────────────────────────────

  const dryTag = DRY_RUN ? " (DRY RUN — no writes performed)" : "";
  console.log("\n" + "=".repeat(60));
  console.log(`SUMMARY${dryTag}`);
  console.log(`  Ghost rows fixed:               ${ghostFixed}`);
  console.log(`  Variant groups created:         ${variantGroups}`);
  console.log(`  Total variants inserted:        ${variantsInserted}`);
  console.log(`  Single-row designs (no change): ${singleRowDesigns}`);
  console.log(`  Errors:                         ${errors}`);
  console.log(
    `  ⚠️  All variant stock_qty set to 0 — update manually or via future inventory import`
  );
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
