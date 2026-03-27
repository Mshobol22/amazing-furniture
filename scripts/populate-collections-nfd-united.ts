/**
 * Populate missing `collection` values for:
 * - Nationwide FD: derive from first image URL path segment after /hd/{Room}/{SubCategory}/...
 * - United Furniture: map from category to readable collection labels.
 *
 * Usage:
 *   npx tsx scripts/populate-collections-nfd-united.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

type ProductRow = {
  id: string;
  name: string | null;
  category: string | null;
  collection: string | null;
  images: string[] | null;
};

const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const UNITED_CATEGORY_COLLECTION_MAP: Record<string, string> = {
  bed: "Beds",
  sofa: "Sofas",
  "bedroom-furniture": "Bedroom Furniture",
  table: "Tables",
  chair: "Chairs",
  cabinet: "Cabinets",
  "tv-stand": "TV Stands",
  rug: "Rugs",
  other: "Other",
};

function isMissingCollection(value: string | null): boolean {
  return value == null || value.trim() === "";
}

function toTitleCase(input: string): string {
  return input
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function readableCollectionFromCategory(category: string | null): string | null {
  if (!category) return null;
  return UNITED_CATEGORY_COLLECTION_MAP[category] ?? toTitleCase(category.replace(/-/g, " "));
}

// SQL-equivalent extraction target:
// split_part(replace(split_part(images[1], '/hd/', 2), '%20', ' '), '/', 2)
function deriveNfdCollectionFromImage(url: string | null | undefined): string | null {
  if (!url) return null;
  const hdSplit = url.split("/hd/");
  if (hdSplit.length < 2) return null;

  const afterHd = hdSplit[1];
  const pathParts = afterHd.split("/");
  if (pathParts.length < 1) return null;

  const subcategoryRaw = pathParts[1];
  const roomRaw = pathParts[0];

  let decoded = subcategoryRaw ?? "";
  try {
    decoded = decodeURIComponent(subcategoryRaw ?? "");
  } catch {
    decoded = (subcategoryRaw ?? "").replace(/%20/g, " ");
  }

  const decodedClean = decoded.trim();
  if (decodedClean && !decodedClean.toLowerCase().endsWith(".jpg")) {
    return decodedClean;
  }

  // Fallback when URL has no subcategory folder (e.g., /hd/Occasional/file.jpg)
  let room = roomRaw ?? "";
  try {
    room = decodeURIComponent(roomRaw ?? "");
  } catch {
    room = (roomRaw ?? "").replace(/%20/g, " ");
  }

  return room.trim() || null;
}

async function fetchMissingCollectionProductsByManufacturer(
  manufacturer: string
): Promise<ProductRow[]> {
  const pageSize = 500;
  let from = 0;
  const allRows: ProductRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,category,collection,images")
      .eq("manufacturer", manufacturer)
      .or("collection.is.null,collection.eq.")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed fetching ${manufacturer} rows: ${error.message}`);
    }

    const rows = (data ?? []) as ProductRow[];
    if (rows.length === 0) break;
    allRows.push(...rows);
    from += rows.length;
  }

  return allRows;
}

async function updateCollectionForIds(ids: string[], collection: string): Promise<number> {
  if (ids.length === 0) return 0;
  const chunkSize = 200;
  let updated = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("products")
      .update({ collection })
      .in("id", chunk)
      .select("id");

    if (error) {
      throw new Error(`Update failed for collection "${collection}": ${error.message}`);
    }
    updated += (data ?? []).length;
  }

  return updated;
}

async function runNfdUpdate(): Promise<void> {
  const rows = await fetchMissingCollectionProductsByManufacturer("Nationwide FD");

  const byCollection = new Map<string, string[]>();
  const preview: Array<{ id: string; image: string; derived: string | null }> = [];

  for (const row of rows) {
    const firstImage = row.images?.[0] ?? null; // SQL images[1] equivalent
    const derived = deriveNfdCollectionFromImage(firstImage);
    preview.push({ id: row.id, image: firstImage ?? "", derived });
    if (!derived) continue;
    const existing = byCollection.get(derived) ?? [];
    existing.push(row.id);
    byCollection.set(derived, existing);
  }

  console.log("\n=== NFD PREVIEW (first 20) ===");
  for (const p of preview.slice(0, 20)) {
    const shortImage = p.image.length > 95 ? `${p.image.slice(0, 95)}...` : p.image;
    console.log(`${p.id} | ${p.derived ?? "(null)"} | ${shortImage}`);
  }

  const derivableCount = Array.from(byCollection.values()).reduce(
    (sum, ids) => sum + ids.length,
    0
  );
  console.log(`\nNFD missing collection rows: ${rows.length}`);
  console.log(`NFD derivable via image path: ${derivableCount}`);

  let updated = 0;
  for (const [collection, ids] of Array.from(byCollection.entries())) {
    const n = await updateCollectionForIds(ids, collection);
    updated += n;
  }

  console.log(`NFD updated rows: ${updated}`);
  console.log(`NFD skipped rows (no derivation): ${rows.length - derivableCount}`);
}

async function runUnitedUpdate(): Promise<void> {
  const rows = await fetchMissingCollectionProductsByManufacturer("United Furniture");

  const byCollection = new Map<string, string[]>();
  const preview: Array<{ id: string; category: string | null; derived: string | null }> = [];

  for (const row of rows) {
    if (!isMissingCollection(row.collection)) continue;
    const derived = readableCollectionFromCategory(row.category);
    preview.push({ id: row.id, category: row.category, derived });
    if (!derived) continue;
    const existing = byCollection.get(derived) ?? [];
    existing.push(row.id);
    byCollection.set(derived, existing);
  }

  console.log("\n=== UNITED PREVIEW (first 20) ===");
  for (const p of preview.slice(0, 20)) {
    console.log(`${p.id} | category=${p.category ?? "(null)"} | ${p.derived ?? "(null)"}`);
  }

  const derivableCount = Array.from(byCollection.values()).reduce(
    (sum, ids) => sum + ids.length,
    0
  );
  console.log(`\nUnited missing collection rows: ${rows.length}`);
  console.log(`United derivable via category mapping: ${derivableCount}`);

  let updated = 0;
  for (const [collection, ids] of Array.from(byCollection.entries())) {
    const n = await updateCollectionForIds(ids, collection);
    updated += n;
  }

  console.log(`United updated rows: ${updated}`);
  console.log(`United skipped rows (no derivation): ${rows.length - derivableCount}`);
}

async function printPostCheck(): Promise<void> {
  const { count: nfdMissingCount, error: nfdErr } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("manufacturer", "Nationwide FD")
    .or("collection.is.null,collection.eq.");
  if (nfdErr) throw new Error(`NFD post-check failed: ${nfdErr.message}`);

  const { count: unitedMissingCount, error: unitedErr } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("manufacturer", "United Furniture")
    .or("collection.is.null,collection.eq.");
  if (unitedErr) throw new Error(`United post-check failed: ${unitedErr.message}`);

  console.log("\n=== POST-CHECK ===");
  console.log(`NFD remaining missing collection: ${nfdMissingCount ?? 0}`);
  console.log(`United remaining missing collection: ${unitedMissingCount ?? 0}`);
}

async function main() {
  console.log("Starting collection backfill for Nationwide FD + United Furniture...");
  await runNfdUpdate();
  await runUnitedUpdate();
  await printPostCheck();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
