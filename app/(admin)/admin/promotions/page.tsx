import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToProduct } from "@/lib/supabase/products";
import type { Product } from "@/types";
import CreateSaleForm from "@/components/admin/CreateSaleForm";
import ActiveSalesList from "@/components/admin/ActiveSalesList";

export default async function PromotionsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("on_sale", true)
    .order("name", { ascending: true });

  const onSaleProducts = (data ?? []).map((row) =>
    mapRowToProduct(row as Record<string, unknown>)
  ) as Product[];

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Promotions & Sales
      </h1>
      <CreateSaleForm />
      <div className="mt-8">
        <ActiveSalesList products={onSaleProducts} />
      </div>
    </div>
  );
}
