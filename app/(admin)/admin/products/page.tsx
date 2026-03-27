import ProductsTable from "@/components/admin/ProductsTable";
import { fetchAdminFilterStatsSlim } from "@/lib/admin/admin-products-data";

export default async function AdminProductsPage() {
  const filterStats = await fetchAdminFilterStatsSlim();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h1 className="mb-8 text-2xl font-semibold text-charcoal">
        Products
      </h1>
      <ProductsTable filterStats={filterStats} />
    </div>
  );
}
