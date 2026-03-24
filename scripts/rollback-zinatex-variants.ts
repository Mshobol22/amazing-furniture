/**
 * Zinatex Variant Migration — ROLLBACK
 *
 * Undoes the changes made by migrate-zinatex-variants.ts.
 *
 * What this rollback DOES:
 *   1. Delete all product_variants rows whose product_id belongs to a Zinatex product
 *   2. Reset has_variants = false and variant_type = null on all Zinatex products
 *   3. Restore ghost-row SKUs: set sku = name for rows where sku LIKE '%-standalone'
 *      (puts them back to the broken sku=name state, but preserves original name/data)
 *
 * ⚠️  PERMANENT DATA LOSS WARNING ⚠️
 *   Non-parent Zinatex product rows that were DELETED by the migration script
 *   CANNOT be restored by this rollback. Those rows are gone permanently.
 *   To fully restore deleted variant rows, re-run the original import:
 *     node scripts/import-zinatex.mjs
 *   Then re-run the migration from scratch.
 *
 * Run:
 *   DRY_RUN=true  npx ts-node scripts/rollback-zinatex-variants.ts
 *   DRY_RUN=false npx ts-node scripts/rollback-zinatex-variants.ts
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n⏪ Zinatex Variant Migration ROLLBACK — DRY_RUN=${DRY_RUN}`);
  console.log("=".repeat(60));
  console.log("");
  console.log("⚠️  WARNING: Deleted non-parent product rows CANNOT be restored");
  console.log("   by this script. See script header for full recovery steps.");
  console.log("");

  // ── Step 0: Fetch all Zinatex product IDs ──────────────────────────────

  const { data: zinatexProducts, error: fetchErr } = await supabase
    .from("products")
    .select("id, name, sku")
    .eq("manufacturer", "Zinatex");

  if (fetchErr) {
    console.error("ERROR: Failed to fetch Zinatex products:", fetchErr.message);
    process.exit(1);
  }

  if (!zinatexProducts || zinatexProducts.length === 0) {
    console.log("No Zinatex products found — nothing to roll back.");
    return;
  }

  const allIds       = zinatexProducts.map((p: { id: string }) => p.id);
  const standaloneRows = (zinatexProducts as { id: string; name: string; sku: string }[]).filter(
    (p) => p.sku.endsWith("-standalone")
  );

  console.log(`Zinatex products found:   ${allIds.length}`);
  console.log(`Ghost rows to un-fix:     ${standaloneRows.length}`);
  console.log("");

  // ── Step 1: Delete product_variants for all Zinatex products ───────────

  console.log("Step 1: Deleting product_variants for all Zinatex products…");

  if (!DRY_RUN) {
    // Use .in() with parameterized IDs — safe, no string interpolation
    const { error: deleteVariantsErr, count } = await supabase
      .from("product_variants")
      .delete({ count: "exact" })
      .in("product_id", allIds);

    if (deleteVariantsErr) {
      console.error("ERROR: Failed to delete product_variants:", deleteVariantsErr.message);
      process.exit(1);
    }

    console.log(`  Deleted ${count ?? "?"} product_variants rows`);
  } else {
    // Dry run: count what would be deleted
    const { count } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .in("product_id", allIds);

    console.log(`  [DRY RUN] Would delete ${count ?? "?"} product_variants rows`);
  }

  // ── Step 2: Reset has_variants and variant_type on all Zinatex products ─

  console.log("\nStep 2: Resetting has_variants = false, variant_type = null…");

  if (!DRY_RUN) {
    const { error: resetErr } = await supabase
      .from("products")
      .update({ has_variants: false, variant_type: null })
      .eq("manufacturer", "Zinatex");

    if (resetErr) {
      console.error("ERROR: Failed to reset products columns:", resetErr.message);
      process.exit(1);
    }

    console.log(`  Updated ${allIds.length} Zinatex products`);
  } else {
    console.log(`  [DRY RUN] Would reset ${allIds.length} Zinatex products`);
  }

  // ── Step 3: Restore ghost-row SKUs (sku → name) ────────────────────────

  console.log("\nStep 3: Restoring ghost-row SKUs (sku LIKE '%-standalone' → sku = name)…");
  console.log(
    "  Note: this puts ghost rows back to the broken sku=name state,\n" +
    "  but preserves original product names and all other data."
  );

  if (standaloneRows.length === 0) {
    console.log("  No standalone rows found — nothing to restore.");
  } else if (!DRY_RUN) {
    let restored = 0;
    let errors   = 0;

    for (const p of standaloneRows) {
      const { error: restoreErr } = await supabase
        .from("products")
        .update({ sku: p.name })
        .eq("id", p.id);

      if (restoreErr) {
        console.error(`  ERROR: Could not restore sku for id ${p.id}: ${restoreErr.message}`);
        errors++;
      } else {
        restored++;
      }
    }

    console.log(`  Restored: ${restored}   Errors: ${errors}`);
  } else {
    console.log(`  [DRY RUN] Would restore ${standaloneRows.length} ghost-row SKUs`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  const dryTag = DRY_RUN ? " (DRY RUN — no writes performed)" : "";
  console.log("\n" + "=".repeat(60));
  console.log(`ROLLBACK COMPLETE${dryTag}`);
  console.log("");
  console.log("⚠️  REMINDER: Non-parent product rows deleted during migration");
  console.log("   have NOT been restored. To fully recover, re-import from CSV:");
  console.log("     node scripts/import-zinatex.mjs");
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
