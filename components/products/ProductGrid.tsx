import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  collectionCategorySlug?: string;
  collectionManufacturerFilter?: string;
  enableContextualReel?: boolean;
}

export default function ProductGrid({
  products,
  collectionCategorySlug,
  collectionManufacturerFilter,
  enableContextualReel = false,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="text-warm-gray">
        No products found. Try adjusting your filters or search.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          collectionCategorySlug={collectionCategorySlug}
          collectionManufacturerFilter={collectionManufacturerFilter}
          enableContextualReel={enableContextualReel}
        />
      ))}
    </div>
  );
}
