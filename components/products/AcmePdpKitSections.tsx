import Link from "next/link";
import {
  getAcmeProductCardDisplayName,
  hasAcmeColorGroup,
  isAcmeKitProduct,
} from "@/lib/acme-product-display";
import { formatPrice } from "@/lib/format-price";
import { isProductCardImageReady } from "@/lib/supabase/products";
import { getStorefrontListPrice } from "@/lib/zinatex-product-display";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";

function piecePrice(piece: Product): { main: number; list?: number } {
  const list = getStorefrontListPrice(piece);
  if (
    piece.on_sale &&
    piece.sale_price != null &&
    piece.sale_price < list
  ) {
    return { main: piece.sale_price, list };
  }
  return { main: list };
}

interface AcmePdpKitSectionsProps {
  product: Product;
  acmeKitSetPieces: Product[];
  acmeCollectionSiblings: Product[];
}

/**
 * Renders below the PDP image/info grid so carousels span full content width
 * (not the narrow right column).
 */
export default function AcmePdpKitSections({
  product,
  acmeKitSetPieces,
  acmeCollectionSiblings,
}: AcmePdpKitSectionsProps) {
  const kitPieces = acmeKitSetPieces.filter(isProductCardImageReady);
  const collectionSiblings = acmeCollectionSiblings.filter(isProductCardImageReady);

  const kitSetSection =
    isAcmeKitProduct(product) && kitPieces.length > 0 ? (
      <section
        className="mb-8 border-t border-gray-100 pt-6"
        aria-labelledby="acme-kit-set-heading"
      >
        <h3
          id="acme-kit-set-heading"
          className="mb-3 font-cormorant text-lg font-semibold text-[#1C1C1C] md:text-xl"
        >
          What&apos;s in this set
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {kitPieces.map((piece) => {
            const title =
              getAcmeProductCardDisplayName(piece) || piece.name || "Piece";
            const { main, list } = piecePrice(piece);
            return (
              <Link
                key={piece.id}
                href={`/products/${piece.slug}`}
                className="flex w-44 shrink-0 flex-col rounded-lg border border-[#1C1C1C]/15 bg-white p-3 transition-colors hover:border-[#2D4A3E] md:w-52"
              >
                <span className="line-clamp-3 font-sans text-sm font-medium leading-snug text-[#1C1C1C]">
                  {title}
                </span>
                <span className="mt-2 font-sans text-base font-semibold tabular-nums text-[#1C1C1C]">
                  {list != null && list > main ? (
                    <>
                      <span className="text-red-600">{formatPrice(main)}</span>
                      <span className="ml-1.5 text-xs font-normal text-[#1C1C1C]/45 line-through">
                        {formatPrice(list)}
                      </span>
                    </>
                  ) : (
                    formatPrice(main)
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    ) : null;

  const kitCollectionSection =
    (isAcmeKitProduct(product) || hasAcmeColorGroup(product)) &&
    collectionSiblings.length > 0 ? (
      <section
        className="mb-8 border-t border-gray-100 pt-6"
        aria-labelledby="acme-kit-collection-heading"
      >
        <h3
          id="acme-kit-collection-heading"
          className="mb-3 font-cormorant text-lg font-semibold text-[#1C1C1C] md:text-xl"
        >
          Complete the Collection
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {collectionSiblings.map((p) => (
            <div key={p.id} className="w-52 shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>
    ) : null;

  if (!kitSetSection && !kitCollectionSection) return null;

  return (
    <div className="w-full min-w-0">
      {kitSetSection}
      {kitCollectionSection}
    </div>
  );
}
