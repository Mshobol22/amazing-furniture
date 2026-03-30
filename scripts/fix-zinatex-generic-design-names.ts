/**
 * Normalize generic Zinatex rug names:
 *   "<COLLECTION> Design <NUMBER>" -> "<COLLECTION> Rug Design <NUMBER>"
 *
 * Scope is intentionally narrow to avoid touching non-design products.
 *
 * Run:
 *   DRY_RUN=true  npx tsx scripts/fix-zinatex-generic-design-names.ts
 *   DRY_RUN=false npx tsx scripts/fix-zinatex-generic-design-names.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../lib/supabase/admin";

const DRY_RUN = process.env.DRY_RUN !== "false";
const supabase = createAdminClient();

const GENERIC_DESIGN_RE = /^(.+?)\s+Design\s+(\d+)\s*$/i;

function normalizedName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (/\bRug\s+Design\s+\d+\b/i.test(trimmed)) return null;
  const m = trimmed.match(GENERIC_DESIGN_RE);
  if (!m) return null;
  const prefix = m[1]?.trim();
  const num = m[2]?.trim();
  if (!prefix || !num) return null;
  return `${prefix} Rug Design ${num}`;
}

async function main() {
  console.log(`fix-zinatex-generic-design-names DRY_RUN=${DRY_RUN}\n`);

  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,category,manufacturer")
    .eq("manufacturer", "Zinatex")
    .eq("category", "rug");

  if (error || !data) {
    throw error ?? new Error("Failed to read products");
  }

  const targets = data
    .map((row) => {
      const next = normalizedName(String(row.name ?? ""));
      return next ? { id: row.id as string, prev: String(row.name), next, slug: String(row.slug) } : null;
    })
    .filter((v): v is { id: string; prev: string; next: string; slug: string } => Boolean(v));

  console.log(`Rows to rename: ${targets.length}`);
  for (const t of targets.slice(0, 25)) {
    console.log(`- ${t.id} :: "${t.prev}" -> "${t.next}" (${t.slug})`);
  }
  if (targets.length > 25) {
    console.log(`... ${targets.length - 25} more`);
  }

  if (DRY_RUN) {
    console.log("\nDone (dry run).");
    return;
  }

  for (const t of targets) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ name: t.next })
      .eq("id", t.id);
    if (upErr) throw upErr;
  }

  console.log(`\nDone. Renamed ${targets.length} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
