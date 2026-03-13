import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrdersTab from "../OrdersTab";

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen noise-overlay page-account-customer">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="mb-6 inline-flex text-sm font-medium text-[#a0c4a8] hover:text-white hover:underline"
        >
          ← Back to Account
        </Link>
        <h1 className="mb-8 font-display text-3xl font-semibold text-white">
          My Orders
        </h1>
        <OrdersTab orders={orders ?? []} />
      </div>
    </div>
  );
}
