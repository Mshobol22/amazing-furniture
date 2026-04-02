import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    const hasTracking = Object.prototype.hasOwnProperty.call(
      body,
      "tracking_number"
    );
    const hasCarrier = Object.prototype.hasOwnProperty.call(body, "carrier");
    const hasAdminNotes = Object.prototype.hasOwnProperty.call(
      body,
      "admin_notes"
    );

    if (!hasStatus && !hasTracking && !hasCarrier && !hasAdminNotes) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: existing, error: fetchError } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Order status PATCH fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to load order" },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let nextStatus = String(existing.status ?? "").toLowerCase();
    if (hasStatus) {
      const raw = body.status;
      if (typeof raw !== "string") {
        return NextResponse.json(
          { error: "status must be a string" },
          { status: 400 }
        );
      }
      nextStatus = raw.toLowerCase();
      if (!ALLOWED_STATUSES.has(nextStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    const nextTracking = hasTracking
      ? body.tracking_number == null
        ? null
        : String(body.tracking_number)
      : (existing.tracking_number as string | null);

    const nextCarrier = hasCarrier
      ? body.carrier == null
        ? null
        : String(body.carrier)
      : (existing.carrier as string | null);

    const nextAdminNotes = hasAdminNotes
      ? body.admin_notes == null
        ? null
        : String(body.admin_notes)
      : (existing.admin_notes as string | null);

    if (
      nextStatus === "shipped" &&
      (!nextTracking || String(nextTracking).trim() === "")
    ) {
      console.warn(
        `[admin/orders/${id}/status] Status set to shipped without tracking_number`
      );
    }

    const statusUpdatedBy = user.email ?? "";

    const { data: updatedRow, error: updateError } = await adminClient
      .from("orders")
      .update({
        status: nextStatus,
        tracking_number: nextTracking,
        carrier: nextCarrier,
        admin_notes: nextAdminNotes,
        status_updated_at: new Date().toISOString(),
        status_updated_by: statusUpdatedBy,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Order status PATCH update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order: updatedRow });
  } catch (err) {
    console.error("Order status PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
