import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function auditSlugs() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, category")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  const slugSet = new Set<string>();
  const issues: string[] = [];

  for (const p of products ?? []) {
    // Check for missing slug
    if (!p.slug) {
      issues.push(`❌ MISSING SLUG: ID ${p.id} — "${p.name}"`);
      continue;
    }

    // Check for duplicate slugs
    if (slugSet.has(p.slug)) {
      issues.push(`❌ DUPLICATE SLUG: "${p.slug}" — "${p.name}"`);
    }
    slugSet.add(p.slug);

    // Check slug format (lowercase, hyphens only, no spaces or special chars)
    if (!/^[a-z0-9-]+$/.test(p.slug)) {
      issues.push(
        `⚠️  INVALID SLUG FORMAT: "${p.slug}" — "${p.name}"`
      );
    }

    // Check slug doesn't end in a bare SKU without meaning
    if (/^[a-z]?\d+$/.test(p.slug)) {
      issues.push(
        `⚠️  SKU-ONLY SLUG: "${p.slug}" — "${p.name}" (should include descriptive words)`
      );
    }
  }

  console.log(`\n📦 Total products: ${products?.length ?? 0}`);
  console.log(`✅ Unique slugs: ${slugSet.size}`);

  if (issues.length === 0) {
    console.log("✅ All slugs valid — no issues found\n");
  } else {
    console.log(`\n❌ Issues found (${issues.length}):`);
    issues.forEach((i) => console.log(i));
    console.log("");
  }
}

auditSlugs();
