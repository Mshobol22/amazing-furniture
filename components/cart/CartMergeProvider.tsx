"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import useCartStore, { readGuestCart, clearGuestCart } from "@/store/cartStore";

export default function CartMergeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const merging = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // Restore guest cart on initial load (covers page refresh)
    const stored = readGuestCart();
    const current = useCartStore.getState().items;
    if (stored.length > 0 && current.length === 0) {
      useCartStore.getState().setItems(stored);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN") return;
      if (merging.current) return;
      merging.current = true;

      try {
        const guestItems = readGuestCart();
        // Also include whatever is currently in the Zustand store
        const storeItems = useCartStore.getState().items;

        // Build a combined guest list (store items + localStorage)
        const combined = new Map<string, { product_id: string; quantity: number }>();
        for (const item of storeItems) {
          combined.set(item.product.id, {
            product_id: item.product.id,
            quantity: item.quantity,
          });
        }
        for (const item of guestItems) {
          const existing = combined.get(item.product.id);
          combined.set(item.product.id, {
            product_id: item.product.id,
            quantity: Math.max(existing?.quantity ?? 0, item.quantity),
          });
        }

        const itemsToMerge = Array.from(combined.values());
        if (itemsToMerge.length === 0) return;

        const res = await fetch("/api/cart/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest_items: itemsToMerge }),
        });

        if (res.ok) {
          const { items } = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            useCartStore.getState().setItems(items);
          }
          clearGuestCart();
        }
      } catch {
        // Merge failed silently — guest cart stays in localStorage for retry
      } finally {
        merging.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
