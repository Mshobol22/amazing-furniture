import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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

/** Safe lead image for next/image — https only, not used for listing gate. */
function componentCardImageUrl(piece: Product): string | null {
  const u = piece.images?.[0];
  return typeof u === "string" && u.startsWith("https://") ? u : null;
}

interface AcmePdpKitSectionsProps {
  product: Product;
  acmeKitSetPieces: Product[];
  acmeCollectionSiblings: Product[];
}

const SECTION_HEADING =
  "mb-4 font-cormorant text-xl font-semibold text-[#1C1C1C] md:text-2xl";

/**
 * Renders below the PDP image/info grid so carousels span full content width
 * (not the narrow right column).
 */
export default function AcmePdpKitSections({
  product,
  acmeKitSetPieces,
  acmeCollectionSiblings,
}: AcmePdpKitSectionsProps) {
  const collectionSiblings = acmeCollectionSiblings.filter(isProductCardImageReady);

  const kitSetSection =
    isAcmeKitProduct(product) && acmeKitSetPieces.length > 0 ? (
      <section
        className="mb-8 border-t border-gray-100 pt-6"
        aria-labelledby="acme-kit-set-heading"
      >
        <h2 id="acme-kit-set-heading" className={SECTION_HEADING}>
          What&apos;s in this set
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {acmeKitSetPieces.map((piece) => {
            const title =
              getAcmeProductCardDisplayName(piece) || piece.name || "Piece";
            const { main, list } = piecePrice(piece);
            const img = componentCardImageUrl(piece);
            return (
              <Link
                key={piece.id}
                href={`/products/${piece.slug}`}
                className="flex w-[200px] shrink-0 flex-col rounded-lg border border-[#1C1C1C]/15 bg-[#FAF8F5] p-3 transition-colors hover:border-[#2D4A3E] md:w-[220px]"
              >
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-[#E8E6E1]">
                  {img ? (
                    <Image
                      src={img}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 200px, 220px"
                    />
                  ) : null}
                </div>
                <span className="line-clamp-3 min-h-[2.75rem] font-sans text-sm font-medium leading-snug text-[#1C1C1C]">
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
                <span className="mt-3 inline-flex items-center gap-0.5 font-sans text-sm font-semibold text-[#2D4A3E]">
                  <span className="sr-only">View {title}</span>
                  <ChevronRight className="h-5 w-5" aria-hidden />
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
        <h2 id="acme-kit-collection-heading" className={SECTION_HEADING}>
          Complete the Collection
        </h2>
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
