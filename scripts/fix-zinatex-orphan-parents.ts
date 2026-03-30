/**
 * Zinatex migration left duplicate parent rows: same `-ztx-{styleKey}` slug suffix,
 * `has_variants=true`, but zero `product_variants` rows. Those PDPs hide the variant UI.
 *
 * - If another Zinatex product shares the same NUMERIC style key (slug ends with
 *   `-ztx-` + 3+ digits, e.g. 1099) and HAS variant rows → delete orphan.
 *   NEVER merge on generic keys (star, premium, 5d, marble, …) — they collide across designs.
 * - Else → set has_variants=false (single-SKU PDP).
 *
 * Run: DRY_RUN=false npx tsx scripts/fix-zinatex-orphan-parents.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.env.DRY_RUN !== "false";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(url, key);

function styleKeyFromSlug(slug: string): string | null {
  const m = slug.match(/-ztx-(.+)$/i);
  return m ? m[1].toLowerCase() : null;
}

function isSafeNumericDesignKey(key: string): boolean {
  return /^\d{3,}$/.test(key.trim());
}

async function main() {
  console.log(`fix-zinatex-orphan-parents DRY_RUN=${DRY_RUN}\n`);

  const { data: variantRows, error: vErr } = await supabase
    .from("product_variants")
    .select("product_id");

  if (vErr) {
    console.error(vErr);
    process.exit(1);
  }

  const variantCountByProduct = new Map<string, number>();
  for (const r of variantRows ?? []) {
    const id = r.product_id as string;
    variantCountByProduct.set(id, (variantCountByProduct.get(id) ?? 0) + 1);
  }

  const { data: zProducts, error } = await supabase
    .from("products")
    .select("id, name, slug, has_variants")
    .eq("manufacturer", "Zinatex");

  if (error || !zProducts) {
    console.error(error);
    process.exit(1);
  }

  const byStyleKey = new Map<string, typeof zProducts>();
  for (const p of zProducts) {
    const k = styleKeyFromSlug(p.slug);
    if (!k) continue;
    const list = byStyleKey.get(k) ?? [];
    list.push(p);
    byStyleKey.set(k, list);
  }

  let deleted = 0;
  let demoted = 0;

  const orphanParents = zProducts.filter(
    (p) => p.has_variants === true && (variantCountByProduct.get(p.id) ?? 0) === 0
  );

  for (const p of orphanParents) {
    const key = styleKeyFromSlug(p.slug);
    if (!key) {
      console.warn(`[SKIP] no style key in slug: ${p.slug} (${p.id})`);
      continue;
    }

    const group = byStyleKey.get(key) ?? [];
    const canonical = group.find(
      (g) => g.id !== p.id && (variantCountByProduct.get(g.id) ?? 0) > 0
    );

    if (canonical) {
      if (isSafeNumericDesignKey(key)) {
        console.log(
          `[DELETE ORPHAN] ${p.name} (${p.id}) slug=${p.slug} → keep ${canonical.name} (${canonical.id})`
        );
        if (!DRY_RUN) {
          const { error: delErr } = await supabase.from("products").delete().eq("id", p.id);
          if (delErr) {
            console.error(`  delete failed: ${delErr.message}`);
          } else {
            deleted++;
          }
        } else {
          deleted++;
        }
        continue;
      }
      console.log(
        `[DEMOTE] ${p.name} (${p.id}) has_variants→false (peer exists but slug key "${key}" is not a numeric design — not auto-deleting duplicate row)`
      );
    } else {
      console.log(`[DEMOTE] ${p.name} (${p.id}) has_variants→false (no peer with variants)`);
    }
    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("products")
        .update({ has_variants: false })
        .eq("id", p.id);
      if (upErr) console.error(`  update failed: ${upErr.message}`);
      else demoted++;
    } else {
      demoted++;
    }
  }

  console.log(`\nDone. deleted=${deleted} demoted=${demoted} dry=${DRY_RUN}`);
}

main().catch(console.error);
