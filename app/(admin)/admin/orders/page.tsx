import { createAdminClient } from "@/lib/supabase/admin";
import OrdersTable from "@/components/admin/OrdersTable";

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8">
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Orders
      </h1>
      <OrdersTable orders={orders ?? []} />
    </div>
  );
}
