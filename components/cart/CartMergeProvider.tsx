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

async function fetchAndApplyServerCart(
  cancelled?: () => boolean
): Promise<void> {
  const res = await fetch("/api/cart");
  if (cancelled?.()) return;
  if (!res.ok) return;
  const data = (await res.json()) as { items?: unknown };
  if (cancelled?.()) return;
  if (!Array.isArray(data.items)) return;
  useCartStore.getState().setItems(data.items as CartItem[]);
  clearGuestCart();
  clearSessionId();
}

const MERGED_USER_KEY = "cart_merged_user_id";

function readMergedUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(MERGED_USER_KEY);
  } catch {
    return null;
  }
}

function setMergedUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MERGED_USER_KEY, userId);
  } catch {
    // no-op (private mode / blocked storage)
  }
}

function clearMergedUserId(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(MERGED_USER_KEY);
  } catch {
    // no-op
  }
}

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
    let cancelled = false;
    const isCancelled = () => cancelled;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let unsubscribeCart: (() => void) | null = null;

    const mergeSignedInCart = async (userId: string) => {
      if (hasMerged.current) return;
      hasMerged.current = true;
      setMergedUserId(userId);

      const items = useCartStore.getState().items;
      let sid = readSessionId() ?? "";

      if (items.length > 0 && !sid) {
        sid = getOrCreateSessionId();
      }

      try {
        let syncOk = true;
        if (items.length > 0 && sid) {
          syncOk = await postGuestCart(sid, items);
        }

        const merged = await postMerge(
          sid || undefined,
          !syncOk && items.length > 0 ? items : undefined
        );

        if (isCancelled()) return;

        if (merged) {
          useCartStore.getState().setItems(merged as CartItem[]);
          clearSessionId();
          clearGuestCart();
        } else {
          await fetchAndApplyServerCart(isCancelled);
        }
      } catch {
        /* keep hasMerged true — no retry storm; next merge only after SIGNED_OUT + SIGNED_IN */
      }
    };

    void (async () => {
      const stored = readGuestCart();
      const current = useCartStore.getState().items;
      if (stored.length > 0 && current.length === 0) {
        useCartStore.getState().setItems(stored);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (isCancelled()) return;

      if (session?.user) {
        await fetchAndApplyServerCart(isCancelled);
      }
      if (isCancelled()) return;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const userId = session.user.id;
          if (readMergedUserId() === userId) {
            hasMerged.current = true;
            return;
          }
          await mergeSignedInCart(userId);
        }
        if (event === "SIGNED_OUT") {
          hasMerged.current = false;
          clearMergedUserId();
          clearSessionId();
        }
      });

      if (isCancelled()) {
        subscription.unsubscribe();
        return;
      }
      authSubscription = subscription;

      unsubscribeCart = useCartStore.subscribe((state) => {
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
    })();

    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
      unsubscribeCart?.();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  return <>{children}</>;
}
