import type { ProductVariant } from "@/types";

/** Map DB row → typed variant; numeric fields parsed for safe display/cart. */
export function mapRowToProductVariant(row: Record<string, unknown>): ProductVariant {
  return {
    id: row.id as string,
    product_id: row.product_id as string,
    sku: String(row.sku ?? ""),
    color: row.color != null ? String(row.color) : null,
    size: row.size != null ? String(row.size) : null,
    price: Number(row.price),
    compare_at_price:
      row.compare_at_price != null && row.compare_at_price !== ""
        ? Number(row.compare_at_price)
        : null,
    stock_qty: Number(row.stock_qty ?? 0),
    in_stock: Boolean(row.in_stock),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    sort_order: row.sort_order != null ? Number(row.sort_order) : 0,
  };
}
