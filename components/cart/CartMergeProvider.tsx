"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import useCartStore, { readGuestCart, clearGuestCart } from "@/store/cartStore";
import {
  getOrCreateSessionId,
  clearSessionId,
  readSessionId,
  cartItemsToPayload,
} from "@/lib/cart-session";
import type { CartItem } from "@/types";

async function postGuestCart(sessionId: string, items: CartItem[]) {
  const res = await fetch("/api/cart/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      items: cartItemsToPayload(items),
    }),
  });
  return res.ok;
}

async function postMerge(
  sessionId?: string | null,
  fallbackGuestItems?: CartItem[]
) {
  const body: {
    session_id?: string;
    guest_items?: ReturnType<typeof cartItemsToPayload>;
  } = {};
  if (sessionId) body.session_id = sessionId;
  if (fallbackGuestItems?.length) {
    body.guest_items = cartItemsToPayload(fallbackGuestItems);
  }
  const res = await fetch("/api/cart/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: unknown };
  return Array.isArray(data.items) ? data.items : null;
}

export default function CartMergeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasMerged = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const stored = readGuestCart();
    const current = useCartStore.getState().items;
    if (stored.length > 0 && current.length === 0) {
      useCartStore.getState().setItems(stored);
    }

    const mergeSignedInCart = async () => {
      if (hasMerged.current) return;
      const items = useCartStore.getState().items;
      let sid = readSessionId() ?? "";

      if (items.length > 0 && !sid) {
        sid = getOrCreateSessionId();
      }

      hasMerged.current = true;
      try {
        let syncOk = true;
        if (items.length > 0 && sid) {
          syncOk = await postGuestCart(sid, items);
        }

        const merged = await postMerge(
          sid || undefined,
          !syncOk && items.length > 0 ? items : undefined
        );

        if (merged) {
          useCartStore.getState().setItems(merged);
          clearSessionId();
          clearGuestCart();
        } else {
          hasMerged.current = false;
        }
      } catch {
        hasMerged.current = false;
      }
    };

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) await mergeSignedInCart();
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await mergeSignedInCart();
      }
      if (event === "SIGNED_OUT") {
        hasMerged.current = false;
        clearSessionId();
      }
    });

    const unsubscribeCart = useCartStore.subscribe((state) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) return;
          if (state.items.length === 0) return;
          const sid = getOrCreateSessionId();
          if (!sid) return;
          void postGuestCart(sid, useCartStore.getState().items);
        });
      }, 450);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeCart();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  return <>{children}</>;
}
