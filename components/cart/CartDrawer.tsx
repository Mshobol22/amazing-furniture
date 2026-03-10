"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Plus, Minus, X } from "lucide-react";
import { useCartStore, useCartItemCount, useCartTotal } from "@/store/cartStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { proxyImage } from "@/lib/utils";

const SHIPPING_THRESHOLD = 299;
const SHIPPING_COST = 29;

export default function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const itemCount = useCartItemCount();
  const subtotal = useCartTotal();
  const shipping =
    subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;

  const categoryLabel = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side="right"
        className="flex w-[420px] max-w-[100vw] flex-col border-l bg-cream p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-display text-xl text-charcoal">
              Your Cart
            </SheetTitle>
            {itemCount > 0 && (
              <Badge className="bg-walnut text-cream hover:bg-walnut/90">
                {itemCount}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ShoppingBag className="h-16 w-16 text-warm-gray" />
              </motion.div>
              <p className="text-center font-display text-lg text-charcoal">
                Your cart is empty
              </p>
              <Button asChild variant="outline" className="border-charcoal">
                <Link href="/products" onClick={() => closeCart()}>
                  Start Shopping
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 border-b border-light-sand py-4 last:border-0"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-light-sand">
                        <Image
                          src={proxyImage(item.product.images[0] ?? "")}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-medium text-charcoal">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-warm-gray">
                          {categoryLabel(item.product.category)}
                        </p>
                        <p className="mt-1 text-sm text-warm-gray">
                          ${item.product.price.toLocaleString()} each
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                Math.max(1, item.quantity - 1)
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
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
                            size="icon"
                            className="ml-auto h-7 w-7 text-warm-gray hover:text-charcoal"
                            onClick={() => removeItem(item.product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="shrink-0 font-medium text-charcoal">
                        $
                        {(
                          item.product.price * item.quantity
                        ).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="sticky bottom-0 border-t bg-cream p-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-warm-gray">Shipping</span>
                    {shipping === 0 ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        FREE SHIPPING
                      </span>
                    ) : (
                      <span>$29 shipping</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${total.toLocaleString()}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/cart" onClick={() => closeCart()}>
                      View Cart
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 bg-walnut text-cream hover:bg-walnut/90">
                    <Link href="/checkout" onClick={() => closeCart()}>
                      Checkout
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
