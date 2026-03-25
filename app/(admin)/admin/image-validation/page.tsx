import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import ValidationRunner from "./ValidationRunner";

async function getImageValidationStats() {
  const admin = createAdminClient();

  const [validRes, brokenRes, pendingRes, brokenProductsRes] = await Promise.all([
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("images_validated", true),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("images_validated", false),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("images_validated", null),
    admin
      .from("products")
      .select("id, name, sku, manufacturer, images")
      .eq("images_validated", false)
      .order("name", { ascending: true }),
  ]);

  return {
    valid: validRes.count ?? 0,
    broken: brokenRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    brokenProducts: brokenProductsRes.data ?? [],
  };
}

export default async function ImageValidationPage() {
  // Secondary auth guard (layout also checks, but task requires it here too)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect("/sign-in");
  }

  const stats = await getImageValidationStats();

  const statCards = [
    {
      label: "All Images Valid",
      value: stats.valid,
      icon: CheckCircle,
      iconColor: "text-green-700",
      iconBg: "bg-green-100",
    },
    {
      label: "Fully Broken",
      value: stats.broken,
      icon: XCircle,
      iconColor: stats.broken > 0 ? "text-red-600" : "text-gray-400",
      iconBg: stats.broken > 0 ? "bg-red-100" : "bg-gray-100",
    },
    {
      label: "Not Yet Checked",
      value: stats.pending,
      icon: Clock,
      iconColor: stats.pending > 0 ? "text-amber-700" : "text-gray-400",
      iconBg: stats.pending > 0 ? "bg-amber-100" : "bg-gray-100",
    },
  ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-charcoal">
        Image Validation
      </h1>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`rounded-lg p-3 ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Run batch — client component */}
      <div className="mb-8">
        <ValidationRunner />
      </div>

      {/* Fully broken products table */}
      {stats.brokenProducts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Products with No Valid Images
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Original image URLs preserved below for manual review and correction.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "SKU", "Manufacturer", "Broken Image URLs"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {stats.brokenProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {product.sku ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {product.manufacturer ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <ul className="space-y-1">
                        {(product.images ?? []).map((url: string, i: number) => (
                          <li
                            key={i}
                            className="max-w-md truncate rounded bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700"
                            title={url}
                          >
                            {url}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.brokenProducts.length === 0 && stats.broken === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <p className="font-medium text-green-800">No fully broken products found.</p>
          <p className="mt-1 text-sm text-green-600">
            Run a validation batch to check unvalidated products.
          </p>
        </div>
      )}
    </div>
  );
}
