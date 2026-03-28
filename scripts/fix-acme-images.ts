/**
 * Fix ACME placeholder images by probing the ACME CDN and updating Supabase.
 *
 * Preview (no DB writes):
 *   PowerShell: $env:DRY_RUN="true"; npx tsx scripts/fix-acme-images.ts
 *   bash:       DRY_RUN=true npx tsx scripts/fix-acme-images.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER = "/images/placeholder-product.jpg";
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 200;
const PAGE_SIZE = 1000;

const DRY_RUN = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

function acmeCdnUrl(sku: string): string | null {
  const s = sku.trim();
  if (s.length < 2) return null;
  const a = s[0]!.toLowerCase();
  const b = s[1]!.toLowerCase();
  return `https://www.acmecorp.com/media/catalog/product/${a}/${b}/${s.toLowerCase()}.jpg`;
}

async function imageExists(candidateUrl: string): Promise<boolean> {
  try {
    const res = await fetch(candidateUrl, {
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

type Row = {
  id: string;
  sku: string | null;
  name: string;
  images: string[] | null;
};

async function fetchAllAcmePlaceholderSecondImage(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, images")
      .eq("manufacturer", "ACME")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase fetch error:", error);
      process.exit(1);
    }

    const chunk = data ?? [];
    for (const row of chunk) {
      const images = row.images as string[] | null;
      if (images?.[1] === PLACEHOLDER) {
        out.push(row as Row);
      }
    }

    if (chunk.length < PAGE_SIZE) break;
  }
  return out;
}

async function main() {
  console.log(DRY_RUN ? "DRY_RUN=true — no database updates will be written.\n" : "LIVE run — products will be updated.\n");

  const rows = await fetchAllAcmePlaceholderSecondImage();
  console.log(`Matched ACME products with images[1] === ${PLACEHOLDER}: ${rows.length}\n`);

  let tested = 0;
  let found = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const probeResults = await Promise.all(
      batch.map(async (row) => {
        const skuSource = (row.sku?.trim() || row.name?.trim() || "").trim();
        const candidate = acmeCdnUrl(skuSource);
        if (!candidate) {
          return { row, candidate: null as string | null, ok: false, skipShort: true };
        }
        const ok = await imageExists(candidate);
        return { row, candidate, ok, skipShort: false };
      })
    );

    for (const pr of probeResults) {
      if (pr.skipShort) {
        console.warn(`Skip ${pr.row.id} — SKU/name too short for CDN path`);
        continue;
      }
      tested += 1;
      if (!pr.ok || !pr.candidate) continue;

      found += 1;

      if (DRY_RUN) {
        const skuSource = (pr.row.sku?.trim() || pr.row.name?.trim() || "").trim();
        console.log(
          `[DRY_RUN] would update ${pr.row.id} (${skuSource}) -> images = ['${pr.candidate}']`
        );
      } else {
        const { error } = await supabase
          .from("products")
          .update({ images: [pr.candidate] })
          .eq("id", pr.row.id);

        if (error) {
          console.error(`Update failed ${pr.row.id}:`, error.message);
        } else {
          updated += 1;
          const skuSource = (pr.row.sku?.trim() || pr.row.name?.trim() || "").trim();
          console.log(`Updated ${pr.row.id} (${skuSource})`);
        }
      }
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Tested (HTTP probe): ${tested}`);
  console.log(`Found (200/206):     ${found}`);
  if (DRY_RUN) {
    console.log(`Would update:        ${found}`);
  } else {
    console.log(`Updated in DB:       ${updated}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
