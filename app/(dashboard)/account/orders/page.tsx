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
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-[#0D2818] py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/account"
            className="inline-flex text-sm font-medium text-white/60 hover:text-white transition-colors mb-4"
          >
            ← Back to Account
          </Link>
          <h1 className=" text-2xl font-semibold text-white">
            My Orders
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <OrdersTab orders={orders ?? []} />
      </div>
    </div>
  );
}
