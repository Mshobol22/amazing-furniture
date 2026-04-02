"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  Fragment,
  Suspense,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format-price";
import { useToast } from "@/hooks/use-toast";
import { Loader2, StickyNote, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  subtotal?: number;
  shipping?: number;
  tax_amount?: number;
  total: number;
  status: string;
  shipping_address: Record<string, unknown>;
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    variant_id?: string;
    variant_sku?: string;
    variant_size?: string;
    variant_color?: string;
  }>;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  tracking_number?: string | null;
  carrier?: string | null;
  admin_notes?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
}

/** Badge colors per product spec */
const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-gray-200 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-amber-100 text-amber-900",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-[#2D4A3E] text-white",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

const CARRIER_OPTIONS = ["UPS", "FedEx", "USPS", "DHL", "Other"] as const;
/** Select value when admin skips carrier */
const CARRIER_SKIP = "__skip__";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 14) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 8) return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
}

function trackingHref(carrier: string | null | undefined, tracking: string): string {
  const num = encodeURIComponent(tracking.trim());
  const c = (carrier ?? "").toLowerCase();
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${num}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${num}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`;
  if (c.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${num}`;
  return `https://www.google.com/search?q=${num}+track`;
}

function formatOrderNumber(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OrdersTableInner({ orders: initialOrders }: { orders: OrderRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const statusFilter = searchParams.get("status") || "all";

  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMenuOrderId, setStatusMenuOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [shipDialog, setShipDialog] = useState<{
    orderId: string;
    carrier: string;
    tracking: string;
  } | null>(null);
  const [notesDialog, setNotesDialog] = useState<{
    orderId: string;
    text: string;
  } | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (!statusMenuOrderId) return;
    const onDown = (e: MouseEvent) => {
      const el = statusMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setStatusMenuOrderId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [statusMenuOrderId]);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status.toLowerCase() === statusFilter);
  }, [orders, statusFilter]);

  const selectedOrder = selectedId
    ? orders.find((o) => o.id === selectedId)
    : null;

  async function patchOrder(
    orderId: string,
    payload: Record<string, unknown>
  ): Promise<OrderRow | null> {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      order?: OrderRow;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || "Update failed");
    }
    if (!data.order) return null;
    return data.order;
  }

  async function applyStatusChange(order: OrderRow, next: OrderStatus) {
    if (next === order.status.toLowerCase() as OrderStatus) {
      setStatusMenuOrderId(null);
      return;
    }
    if (next === "shipped") {
      setStatusMenuOrderId(null);
      const known = CARRIER_OPTIONS.find((c) => c === order.carrier);
      setShipDialog({
        orderId: order.id,
        carrier: known ?? CARRIER_SKIP,
        tracking: order.tracking_number ?? "",
      });
      return;
    }

    const prev = { ...order };
    setOrders((rows) =>
      rows.map((r) =>
        r.id === order.id ? { ...r, status: next } : r
      )
    );
    setStatusMenuOrderId(null);
    setUpdatingOrderId(order.id);
    try {
      const updated = await patchOrder(order.id, { status: next });
      if (updated) {
        setOrders((rows) => rows.map((r) => (r.id === order.id ? updated : r)));
      }
      toast({ title: "Status updated" });
    } catch (e) {
      setOrders((rows) =>
        rows.map((r) => (r.id === order.id ? prev : r))
      );
      toast({
        title: "Could not update status",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function confirmShipment() {
    if (!shipDialog) return;
    const orderId = shipDialog.orderId;
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      setShipDialog(null);
      return;
    }
    const prev = { ...order };
    const carrierValue =
      shipDialog.carrier === CARRIER_SKIP ? null : shipDialog.carrier;
    const trackingValue = shipDialog.tracking.trim() || null;
    setOrders((rows) =>
      rows.map((r) =>
        r.id === orderId
          ? {
              ...r,
              status: "shipped",
              carrier: carrierValue,
              tracking_number: trackingValue,
            }
          : r
      )
    );
    setShipDialog(null);
    setUpdatingOrderId(orderId);
    try {
      const updated = await patchOrder(orderId, {
        status: "shipped",
        carrier: carrierValue,
        tracking_number: trackingValue,
      });
      if (updated) {
        setOrders((rows) => rows.map((r) => (r.id === orderId ? updated : r)));
      }
      toast({ title: "Marked as shipped" });
    } catch (e) {
      setOrders((rows) =>
        rows.map((r) => (r.id === orderId ? prev : r))
      );
      toast({
        title: "Could not update shipment",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function saveAdminNotes() {
    if (!notesDialog) return;
    setSavingNotes(true);
    try {
      const updated = await patchOrder(notesDialog.orderId, {
        admin_notes: notesDialog.text,
      });
      if (updated) {
        setOrders((rows) =>
          rows.map((r) => (r.id === notesDialog.orderId ? updated : r))
        );
      }
      toast({ title: "Note saved" });
      setNotesDialog(null);
    } catch (e) {
      toast({
        title: "Could not save note",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-warm-gray">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-warm-gray">Filter:</span>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog
        open={!!shipDialog}
        onOpenChange={(open) => {
          if (!open) setShipDialog(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Confirm shipment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ship-carrier">Carrier</Label>
              <Select
                value={shipDialog?.carrier ?? CARRIER_SKIP}
                onValueChange={(v) =>
                  setShipDialog((d) => (d ? { ...d, carrier: v } : d))
                }
              >
                <SelectTrigger id="ship-carrier">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CARRIER_SKIP}>Skip (no carrier)</SelectItem>
                  {CARRIER_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ship-tracking">Tracking number</Label>
              <Input
                id="ship-tracking"
                value={shipDialog?.tracking ?? ""}
                onChange={(e) =>
                  setShipDialog((d) => (d ? { ...d, tracking: e.target.value } : d))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmShipment()}>Confirm Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!notesDialog}
        onOpenChange={(open) => {
          if (!open) setNotesDialog(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Admin notes</DialogTitle>
          </DialogHeader>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={notesDialog?.text ?? ""}
            onChange={(e) =>
              setNotesDialog((d) => (d ? { ...d, text: e.target.value } : d))
            }
            placeholder="Internal notes (not visible to customers)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>
              Cancel
            </Button>
            <Button disabled={savingNotes} onClick={() => void saveAdminNotes()}>
              {savingNotes ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving
                </>
              ) : (
                "Save Note"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Order ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Customer Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Total ($)
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-charcoal">
                Date
              </th>
              <th className="w-12 px-2 py-3 text-center font-medium text-charcoal">
                <span className="sr-only">Notes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <Fragment key={order.id}>
                <tr
                  onClick={() =>
                    setSelectedId(selectedId === order.id ? null : order.id)
                  }
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-charcoal">
                    {formatOrderNumber(order.id)}
                  </td>
                  <td
                    className="px-4 py-2 text-charcoal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>{order.customer_name}</div>
                    {order.tracking_number &&
                      String(order.tracking_number).trim() !== "" && (
                        <a
                          href={trackingHref(
                            order.carrier,
                            String(order.tracking_number)
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block text-xs text-gray-500 underline hover:text-gray-700"
                        >
                          {order.carrier
                            ? `${order.carrier}: ${order.tracking_number}`
                            : order.tracking_number}
                        </a>
                      )}
                  </td>
                  <td className="px-4 py-2 text-warm-gray">
                    {order.customer_email}
                  </td>
                  <td className="px-4 py-2 text-charcoal">
                    {formatPrice(Number(order.total))}
                  </td>
                  <td
                    className="px-4 py-2 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="relative inline-block"
                      ref={
                        statusMenuOrderId === order.id ? statusMenuRef : null
                      }
                    >
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() =>
                          setStatusMenuOrderId((id) =>
                            id === order.id ? null : order.id
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_BADGE_STYLES[order.status.toLowerCase()] ??
                            "bg-gray-100 text-gray-800"
                        )}
                      >
                        {updatingOrderId === order.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        <span>{order.status}</span>
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>
                      {statusMenuOrderId === order.id && (
                        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                          {ORDER_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={cn(
                                "block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50",
                                s === order.status.toLowerCase() &&
                                  "bg-gray-100 font-semibold"
                              )}
                              onClick={() => void applyStatusChange(order, s)}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {order.status_updated_at && (
                      <p className="mt-1 max-w-[11rem] text-[10px] leading-tight text-gray-500">
                        Updated {formatRelativeTime(order.status_updated_at)} by{" "}
                        {order.status_updated_by || "—"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-warm-gray">
                    {formatDate(order.created_at)}
                  </td>
                  <td
                    className="px-2 py-2 text-center align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500"
                      aria-label="Admin notes"
                      onClick={() =>
                        setNotesDialog({
                          orderId: order.id,
                          text: order.admin_notes ?? "",
                        })
                      }
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                {selectedId === order.id && selectedOrder && (
                  <tr key={`${order.id}-detail`} className="bg-gray-50">
                    <td colSpan={7} className="px-4 py-6">
                      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                        <div>
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Full Order ID
                          </h3>
                          <p className="font-mono text-sm text-charcoal">
                            {selectedOrder.id}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Items
                          </h3>
                          <ul className="mt-2 space-y-2">
                            {selectedOrder.items?.map((item, i) => (
                              <li
                                key={i}
                                className="flex justify-between text-sm text-charcoal"
                              >
                                <span>
                                  <span>
                                    {item.name} × {item.quantity}
                                  </span>
                                  {(item.variant_size || item.variant_color) && (
                                    <span className="ml-1 text-gray-500">
                                      (
                                      {[item.variant_size, item.variant_color]
                                        .filter(Boolean)
                                        .join(" / ")}
                                      )
                                    </span>
                                  )}
                                  {item.variant_sku && (
                                    <span className="block text-xs text-gray-400">
                                      SKU: {item.variant_sku}
                                    </span>
                                  )}
                                </span>
                                <span>
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-1 text-sm">
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Totals
                          </h3>
                          {selectedOrder.subtotal != null && (
                            <div className="flex justify-between text-charcoal">
                              <span>Subtotal</span>
                              <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                            </div>
                          )}
                          {selectedOrder.shipping != null && (
                            <div className="flex justify-between text-charcoal">
                              <span>Shipping</span>
                              <span>
                                {selectedOrder.shipping === 0
                                  ? "FREE"
                                  : `$${Number(selectedOrder.shipping).toFixed(2)}`}
                              </span>
                            </div>
                          )}
                          {selectedOrder.tax_amount != null &&
                            selectedOrder.tax_amount > 0 && (
                              <div className="flex justify-between text-charcoal">
                                <span>Tax (10.25%)</span>
                                <span>
                                  ${Number(selectedOrder.tax_amount).toFixed(2)}
                                </span>
                              </div>
                            )}
                          <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold text-charcoal">
                            <span>Total</span>
                            <span>${Number(selectedOrder.total).toFixed(2)}</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xs font-medium uppercase text-warm-gray">
                            Shipping Address
                          </h3>
                          <pre className="mt-2 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-charcoal">
                            {JSON.stringify(
                              selectedOrder.shipping_address,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                        {selectedOrder.stripe_payment_intent_id && (
                          <div>
                            <h3 className="text-xs font-medium uppercase text-warm-gray">
                              Stripe Payment Intent ID
                            </h3>
                            <p className="mt-1 font-mono text-sm text-charcoal">
                              {selectedOrder.stripe_payment_intent_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded bg-gray-100" />}>
      <OrdersTableInner orders={orders} />
    </Suspense>
  );
}
