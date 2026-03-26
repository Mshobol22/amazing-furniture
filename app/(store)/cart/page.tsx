"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ui/ProductImage";
import { ShoppingBag, Plus, Minus, X, Lock, CreditCard } from "lucide-react";
import {
  useCartStore,
  useCartItemCount,
  useCartTotal,
  getEffectivePrice,
} from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-price";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;

const categoryLabel = (cat: string) =>
  cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const itemCount = useCartItemCount();
  const subtotal = useCartTotal();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-6 px-4 py-16">
        <ShoppingBag className="h-20 w-20 text-warm-gray" />
        <h2 className=" text-2xl font-semibold text-charcoal">
          Your cart is empty
        </h2>
        <p className="text-center text-warm-gray">
          Add some furniture to get started.
        </p>
        <Button asChild className="bg-walnut text-cream hover:bg-walnut/90">
          <Link href="/collections/all">Shop All</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className=" text-3xl font-semibold text-charcoal">
              Shopping Cart
            </h1>
            <p className="mt-1 text-warm-gray">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <Link
            href="/collections/all"
            className="text-walnut hover:underline"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Left column - cart items */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-6 rounded-lg border border-light-sand bg-cream p-6"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50 p-1">
                    <ProductImage
                      src={item.product.images[0]}
                      alt={item.product.name}
                      manufacturer={item.product.manufacturer}
                      fill
                      className="object-contain"
                      sizes="96px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className=" text-lg font-medium text-charcoal line-clamp-2">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-warm-gray">
                      {categoryLabel(item.product.category)}
                    </p>
                    <p className="mt-1 text-warm-gray">
                      {formatPrice(item.product.price)}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity + 1
                          )
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-4 text-warm-gray hover:text-charcoal"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-charcoal">
                    {formatPrice(getEffectivePrice(item.product) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-light-sand bg-cream p-6">
              <h2 className="mb-6 text-xl font-semibold text-charcoal">
                Order Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-warm-gray">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-warm-gray">Shipping</span>
                  {shipping === 0 ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-sm font-medium text-green-800">
                      FREE
                    </span>
                  ) : (
                    <span>$29.00</span>
                  )}
                </div>
              </div>
              <div className="my-4 border-t border-light-sand" />
              <div className="mb-6 flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="mb-4 flex items-center gap-2 rounded-md border border-light-sand p-2">
                <input
                  type="text"
                  placeholder="Promo code"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-warm-gray"
                />
                <Button variant="outline" size="sm" disabled>
                  Apply
                </Button>
              </div>
              <Button
                asChild
                className="w-full bg-walnut text-cream hover:bg-walnut/90"
              >
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-warm-gray">
                <Lock className="h-4 w-4" />
                <span>Secure Checkout</span>
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
