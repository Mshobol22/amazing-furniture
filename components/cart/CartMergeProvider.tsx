"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import useCartStore, { readGuestCart, clearGuestCart } from "@/store/cartStore";

async function triggerMerge() {
  const guestItems = readGuestCart();
  const storeItems = useCartStore.getState().items;

  // Build a combined guest list (store items + localStorage) keyed by product + variant
  const combined = new Map<string, { product_id: string; variant_id?: string; quantity: number }>();
  for (const item of storeItems) {
    const key = `${item.product.id}:${item.variant_id ?? ""}`;
    combined.set(key, {
      product_id: item.product.id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    });
  }
  for (const item of guestItems) {
    const key = `${item.product.id}:${item.variant_id ?? ""}`;
    const existing = combined.get(key);
    combined.set(key, {
      product_id: item.product.id,
      variant_id: item.variant_id,
      quantity: (existing?.quantity ?? 0) + item.quantity,
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
    if (Array.isArray(items)) useCartStore.getState().setItems(items);
    clearGuestCart();
  }
}

export default function CartMergeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasMerged = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // Restore guest cart on initial load (covers page refresh)
    const stored = readGuestCart();
    const current = useCartStore.getState().items;
    if (stored.length > 0 && current.length === 0) {
      useCartStore.getState().setItems(stored);
    }

    // Check if user is already signed in on mount (catches post-OAuth redirect)
    const checkAndMerge = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && !hasMerged.current) {
        const guestItems = readGuestCart();
        if (guestItems.length > 0) {
          hasMerged.current = true;
          try {
            await triggerMerge();
          } catch {
            hasMerged.current = false;
          }
        }
      }
    };

    checkAndMerge();

    // Also listen for auth state changes (covers in-tab sign-in)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" && !hasMerged.current) {
        const guestItems = readGuestCart();
        if (guestItems.length > 0) {
          hasMerged.current = true;
          try {
            await triggerMerge();
          } catch {
            hasMerged.current = false;
          }
        }
      }
      if (event === "SIGNED_OUT") {
        hasMerged.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
