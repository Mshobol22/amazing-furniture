import { mapRowToProduct } from "@/lib/supabase/products";
import type { Product } from "@/types";
import ProductsTable from "@/components/admin/ProductsTable";
import {
  fetchAllAdminProductRows,
  rowsToFilterStats,
} from "@/lib/admin/admin-products-data";

export default async function AdminProductsPage() {
  const rows = await fetchAllAdminProductRows();
  const filterStats = rowsToFilterStats(rows);

  const products = rows.map((row) =>
    mapRowToProduct(row as Record<string, unknown>)
  ) as Product[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h1 className="mb-8 text-2xl font-semibold text-charcoal">
        Products
      </h1>
      <ProductsTable products={products} filterStats={filterStats} />
    </div>
  );
}
