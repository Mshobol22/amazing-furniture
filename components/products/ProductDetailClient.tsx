"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import {
  getAcmeAboutSpecRows,
  getAcmeDescriptionIntroAfterDash,
  getAcmeProductCardDisplayName,
  isAcmeComponentProduct,
  isAcmeProduct,
} from "@/lib/acme-product-display";
import { isUnitedFurnitureProduct } from "@/lib/united-product-display";
import { formatPrice } from "@/lib/format-price";
import {
  getStandaloneRugSizeLabel,
  getStorefrontListPrice,
} from "@/lib/zinatex-product-display";
import type { Product } from "@/types";

interface ProductDetailClientProps {
  product: Product;
  acmeComponentParentKit?: Product | null;
  acmeComponentSiblingPieces?: Product[];
  renderSiblingComponentsInline?: boolean;
}

function acmeComponentCardPrice(piece: Product): { main: number; list?: number } {
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

export default function ProductDetailClient({
  product,
  acmeComponentParentKit = null,
  acmeComponentSiblingPieces = [],
  renderSiblingComponentsInline = true,
}: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const mainCtaRef = useRef<HTMLDivElement | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const isComponent = isAcmeComponentProduct(product);

  const handleAddToCart = () => {
    if (!product.in_stock) return;
    addItem(product, quantity);
  };

  useEffect(() => {
    try {
      const key = "ahf_recently_viewed";
      const raw = window.localStorage.getItem(key);
      const parsed: Array<{
        id: string;
        name: string;
        slug: string;
        image?: string;
        manufacturer?: string;
        price: number;
      }> = raw ? JSON.parse(raw) : [];
      const entry = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0],
        manufacturer: product.manufacturer,
        price: getStorefrontListPrice(product),
      };
      const next = [entry, ...parsed.filter((item) => item.id !== product.id)].slice(0, 8);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [product]);

  useEffect(() => {
    if (!mainCtaRef.current || isComponent) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.25 }
    );
    observer.observe(mainCtaRef.current);
    return () => observer.disconnect();
  }, [isComponent]);

  const acmeIntro = isAcmeProduct(product)
    ? getAcmeDescriptionIntroAfterDash(product.description)
    : null;
  const acmeSpecRows = isAcmeProduct(product) ? getAcmeAboutSpecRows(product) : [];
  const showAcmeAbout =
    isAcmeProduct(product) && (Boolean(acmeIntro) || acmeSpecRows.length > 0);

  const standaloneRugSize = getStandaloneRugSizeLabel(product);
  const showGenericAbout =
    !isAcmeProduct(product) &&
    (Boolean(product.description?.trim()) || Boolean(standaloneRugSize));

  const aboutSection =
    showAcmeAbout ? (
      <div
        className={
          isComponent ? "mt-6 border-t border-gray-100 pt-6" : "mt-4 border-t border-gray-100 pt-4"
        }
      >
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-widest text-[#1C1C1C]/50">
          About This Product
        </p>
        {acmeIntro ? (
          <p className="mb-4 font-cormorant text-lg font-semibold leading-relaxed text-[#1C1C1C]">
            {acmeIntro}
          </p>
        ) : null}
        {acmeSpecRows.length > 0 ? (
          <dl className="space-y-3">
            {acmeSpecRows.map(({ label, value }) => (
              <div key={label}>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-[#1C1C1C]/55">
                  {label}
                </dt>
                <dd className="mt-1 font-cormorant text-base font-semibold leading-relaxed text-[#1C1C1C]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    ) : showGenericAbout ? (
      <div
        className={
          isComponent ? "mt-6 border-t border-gray-100 pt-6" : "mt-4 border-t border-gray-100 pt-4"
        }
      >
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-widest text-[#1C1C1C]/50">
          About This Product
        </p>
        {product.description?.trim() ? (
          <p className="font-cormorant text-lg font-semibold leading-relaxed text-[#1C1C1C]">
            {product.description}
          </p>
        ) : null}
        {standaloneRugSize ? (
          <dl
            className={
              product.description?.trim()
                ? "mt-4 space-y-3"
                : "space-y-3"
            }
          >
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-[#1C1C1C]/55">
                Size
              </dt>
              <dd className="mt-1 font-cormorant text-base font-semibold leading-relaxed text-[#1C1C1C]">
                {standaloneRugSize}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    ) : null;

  const parentKitThumb =
    acmeComponentParentKit?.images?.[0] &&
    String(acmeComponentParentKit.images[0]).startsWith("https://")
      ? acmeComponentParentKit.images[0]
      : null;

  const partOfSetSection =
    isComponent && acmeComponentParentKit ? (
      <section
        className="mt-6 border-t border-gray-100 pt-6"
        aria-labelledby="acme-component-parent-kit-heading"
      >
        <p
          id="acme-component-parent-kit-heading"
          className="mb-2 font-sans text-xs font-medium uppercase tracking-widest text-[#1C1C1C]/50"
        >
          Part of this set
        </p>
        <Link
          href={`/products/${acmeComponentParentKit.slug}`}
          className="flex gap-4 rounded-lg border border-[#1C1C1C]/15 bg-[#FAF8F5] p-4 transition-colors hover:border-[#2D4A3E]/50 md:gap-5 md:p-5"
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[#E8E6E1] md:h-24 md:w-24">
            {parentKitThumb ? (
              <Image
                src={parentKitThumb}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-cormorant text-lg font-semibold leading-snug text-[#1C1C1C] md:text-xl">
              {getAcmeProductCardDisplayName(acmeComponentParentKit) ||
                acmeComponentParentKit.name}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              {acmeComponentParentKit.on_sale &&
              acmeComponentParentKit.sale_price != null &&
              acmeComponentParentKit.sale_price <
                acmeComponentParentKit.price ? (
                <>
                  <span className="font-sans text-xl font-bold tabular-nums text-red-600 md:text-2xl">
                    {formatPrice(acmeComponentParentKit.sale_price)}
                  </span>
                  <span className="font-sans text-sm tabular-nums text-[#1C1C1C]/45 line-through">
                    {formatPrice(acmeComponentParentKit.price)}
                  </span>
                </>
              ) : (
                <span className="font-sans text-xl font-bold tabular-nums text-[#1C1C1C] md:text-2xl">
                  {formatPrice(getStorefrontListPrice(acmeComponentParentKit))}
                </span>
              )}
            </div>
            <span className="mt-3 inline-flex items-center gap-1 font-sans text-sm font-semibold text-[#2D4A3E]">
              View Full Set
              <span aria-hidden>→</span>
            </span>
          </div>
        </Link>
      </section>
    ) : null;

  const siblingComponentsSection =
    renderSiblingComponentsInline &&
    isComponent &&
    acmeComponentSiblingPieces.length > 0 ? (
      <section
        className="mt-8 border-t border-gray-100 pt-6"
        aria-labelledby="acme-component-siblings-heading"
      >
        <h2
          id="acme-component-siblings-heading"
          className="mb-4 font-cormorant text-xl font-semibold text-[#1C1C1C] md:text-2xl"
        >
          Other pieces in this set
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {acmeComponentSiblingPieces.map((piece) => {
            const title =
              getAcmeProductCardDisplayName(piece) || piece.name || "Piece";
            const { main, list } = acmeComponentCardPrice(piece);
            return (
              <Link
                key={piece.id}
                href={`/products/${piece.slug}`}
                className="flex w-44 shrink-0 flex-col rounded-lg border border-[#1C1C1C]/15 bg-[#FAF8F5] p-3 transition-colors hover:border-[#2D4A3E] md:w-52"
              >
                <div className="mb-3 aspect-square w-full shrink-0 rounded-md bg-[#E8E6E1]" />
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

  const cartDesktop = (
    <div
      ref={mainCtaRef}
      className={
        isComponent
          ? "mt-6 flex flex-col gap-4"
          : "mt-6 hidden flex-col gap-4 sm:flex"
      }
    >
      <div className="flex items-center gap-2">
        <label htmlFor="quantity" className="text-sm font-medium text-charcoal">
          Quantity:
        </label>
        <select
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-md border border-warm-gray/30 bg-cream px-3 py-2 text-charcoal"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {product.in_stock ? (
        <Button
          onClick={handleAddToCart}
          className="w-fit bg-[#1C1C1C] font-sans font-semibold tracking-wide text-white hover:bg-[#2a2a2a]"
        >
          <ShoppingCart className="mr-2 h-4 w-4 text-[#2D4A3E]" />
          Add to Cart
        </Button>
      ) : (
        <Button
          type="button"
          disabled
          className="w-fit cursor-not-allowed bg-gray-300 font-sans font-semibold tracking-wide text-gray-600 hover:bg-gray-300"
        >
          Out of Stock
        </Button>
      )}
    </div>
  );

  return (
    <>
      {isComponent ? (
        <>
          {cartDesktop}
          {partOfSetSection}
          {aboutSection}
          {siblingComponentsSection}
        </>
      ) : (
        <>
          {aboutSection}
          {cartDesktop}
        </>
      )}

      {isUnitedFurnitureProduct(product) &&
      product.page_features &&
      product.page_features.length > 0 ? (
        <section
          className="mt-6 border-t border-gray-100 pt-6 sm:mt-8"
          aria-labelledby="uf-product-features-heading"
        >
          <h3
            id="uf-product-features-heading"
            className="mb-3 font-cormorant text-lg font-semibold text-[#1C1C1C] md:text-xl"
          >
            Product Features
          </h3>
          <ul className="space-y-2.5">
            {product.page_features.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`} className="flex gap-2.5">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#2D4A3E]"
                  aria-hidden
                />
                <span className="font-sans text-sm leading-relaxed text-[#1C1C1C]/80">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Sticky CTA — mobile only (hidden for ACME components: inline cart sits above Part of this set) */}
      {!isComponent && showStickyBar ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3">
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-charcoal"
            aria-label="Quantity"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {product.in_stock ? (
            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-[#1C1C1C] font-sans font-semibold tracking-wide text-white hover:bg-[#2a2a2a]"
            >
              <ShoppingCart className="mr-2 h-4 w-4 text-[#2D4A3E]" />
              Add to Cart
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              className="flex-1 cursor-not-allowed bg-gray-300 font-sans font-semibold tracking-wide text-gray-600 hover:bg-gray-300"
            >
              Out of Stock
            </Button>
          )}
        </div>
      ) : null}
    </>
  );
}
