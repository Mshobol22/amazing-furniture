import { cn } from "@/lib/utils";

/** Matches admin `OrdersTable` badge semantics; delivered uses green per account spec */
const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-gray-200 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-amber-100 text-amber-900",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function orderStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function OrderStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const cls = STATUS_BADGE_STYLES[key] ?? "bg-gray-100 text-gray-800 capitalize";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        cls
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

export function isPendingOrProcessingStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "pending" || s === "processing";
}
