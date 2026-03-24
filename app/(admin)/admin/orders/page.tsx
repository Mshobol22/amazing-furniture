import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OrdersTable from "@/components/admin/OrdersTable";

export default async function AdminOrdersPage() {
  // ── Server-side admin check (defence-in-depth beyond middleware) ────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect("/");
  }

  // ── Fetch all orders using service role (bypasses RLS) ─────────────────
  const adminClient = createAdminClient();
  const { data: orders } = await adminClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className=" text-2xl font-semibold text-charcoal">
          Orders
        </h1>
        <span className="text-sm text-warm-gray">
          {orders?.length ?? 0} orders
        </span>
      </div>
      <OrdersTable orders={orders ?? []} />
    </div>
  );
}
