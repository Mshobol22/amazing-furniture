import { parse } from "csv-parse";
import { Readable } from "node:stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductVariant } from "@/types";

export function validateCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

export async function parseCSVStream(
  response: Response,
  onRow: (row: Record<string, string>) => void | Promise<void>
): Promise<void> {
  if (!response.body) {
    throw new Error("CSV response body is empty");
  }

  const parser = parse({
    columns: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });

  const source = Readable.fromWeb(response.body as any);
  source.pipe(parser);

  for await (const record of parser) {
    await onRow(record as Record<string, string>);
  }
}

export async function batchUpsertProducts(
  supabase: SupabaseClient,
  rows: Partial<Product>[],
  batchSize: number
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (batch.length === 0) continue;

    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "sku" });

    if (error) {
      errors += batch.length;
      console.error("[cron] upsert batch error:", error.message, {
        batchStart: i,
        batchSize: batch.length,
      });
      continue;
    }

    updated += batch.length;
  }

  return { updated, errors };
}

export async function batchUpsertVariants(
  supabase: SupabaseClient,
  rows: Partial<ProductVariant>[],
  batchSize: number
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (batch.length === 0) continue;

    const { error } = await supabase
      .from("product_variants")
      .upsert(batch, { onConflict: "sku" });

    if (error) {
      errors += batch.length;
      console.error("[cron] variant upsert batch error:", error.message, {
        batchStart: i,
        batchSize: batch.length,
      });
      continue;
    }

    updated += batch.length;
  }

  return { updated, errors };
}
