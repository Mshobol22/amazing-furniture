import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToProduct } from "@/lib/supabase/products";
import type { Product } from "@/types";
import ProductsTable from "@/components/admin/ProductsTable";

export default async function AdminProductsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true })
    .limit(500);

  const products = (data ?? []).map((row) =>
    mapRowToProduct(row as Record<string, unknown>)
  ) as Product[];

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Products
      </h1>
      <ProductsTable products={products} />
    </div>
  );
}
