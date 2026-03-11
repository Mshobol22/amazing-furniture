import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";

export default function ProductsLoading() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 h-9 w-64 animate-pulse rounded bg-gray-200" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
