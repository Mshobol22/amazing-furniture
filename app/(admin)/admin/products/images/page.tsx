import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductImageManagerClient from "@/components/admin/ProductImageManagerClient";

type ProductImageManagerRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  manufacturer: string | null;
  images: string[] | null;
};

type PageProps = {
  searchParams?: Promise<{
    query?: string;
  }>;
};

async function getProductsForImageManager(query: string) {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let builder = admin
    .from("products")
    .select("id, name, slug, sku, manufacturer, images")
    .order("name", { ascending: true })
    .limit(trimmed ? 100 : 40);

  if (trimmed) {
    builder = builder.or(
      `name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%,slug.ilike.%${trimmed}%,manufacturer.ilike.%${trimmed}%`
    );
  }

  const { data } = await builder;
  return ((data ?? []) as ProductImageManagerRow[]).map((product) => ({
    ...product,
    images: Array.isArray(product.images) ? product.images : [],
  }));
}

export default async function ProductImageManagerPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect("/sign-in");
  }

  const params = (await searchParams) ?? {};
  const query = params.query ?? "";
  const products = await getProductsForImageManager(query);

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-[#FAF8F5] p-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Product Image Manager</h1>
        <p className="mt-1 text-sm text-gray-600">
          Edit image URLs for any product. Changes take effect immediately on the storefront.
        </p>
      </div>
      <ProductImageManagerClient products={products} searchQuery={query} />
    </div>
  );
}
