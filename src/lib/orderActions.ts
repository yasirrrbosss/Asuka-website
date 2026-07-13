// Pure state-transition logic for admin order actions. The route reads the
// current order document, runs it through here, and only then writes — so an
// action can never be applied to an order in the wrong state (e.g. shipping a
// cancelled order, or double-cancelling and restocking twice).

export interface OrderActionInput {
  action?: string;
  courier?: string;
  resi?: string;
  reason?: string;
  notes?: string;
}

export type OrderActionResult =
  | {
      ok: true;
      /** Fields to set on the order document. */
      update: Record<string, unknown>;
      /** Fields to delete from the order document. */
      remove: string[];
      /** Restore stock for the order's items (cancel of a pending order). */
      restock: boolean;
    }
  | { ok: false; reason: string; status: number };

const str = (v: unknown, max: number): string => String(v ?? "").slice(0, max).trim();

export function applyOrderAction(
  current: Record<string, unknown>,
  input: OrderActionInput,
  nowIso: string,
): OrderActionResult {
  const status = current.status === "shipped" || current.status === "cancelled" ? current.status : "pending";
  const fail = (reason: string, httpStatus = 409): OrderActionResult => ({ ok: false, reason, status: httpStatus });
  const done = (update: Record<string, unknown>, remove: string[] = [], restock = false): OrderActionResult => ({
    ok: true,
    update,
    remove,
    restock,
  });

  switch (input.action) {
    case "verify": {
      if (status === "cancelled") return fail("Order sudah dibatalkan");
      return done({ paymentVerified: true, paymentVerifiedAt: nowIso });
    }
    case "ship": {
      if (status === "cancelled") return fail("Order sudah dibatalkan");
      if (status === "shipped") return fail("Order sudah dikirim");
      const courier = str(input.courier, 100);
      const resi = str(input.resi, 100);
      if (!courier || !resi) return fail("Courier & resi wajib", 400);
      return done({ status: "shipped", shippedAt: nowIso, trackingCourier: courier, trackingNumber: resi });
    }
    case "undo": {
      if (status !== "shipped") return fail("Order belum berstatus shipped");
      // Clear the tracking info too, so the customer track page can't show a
      // stale resi against a pending status.
      return done({ status: "pending", shippedAt: null }, ["trackingCourier", "trackingNumber"]);
    }
    case "cancel": {
      if (status === "cancelled") return fail("Order sudah dibatalkan");
      const reason = str(input.reason, 500);
      if (!reason) return fail("Alasan wajib", 400);
      // Only a pending order returns its stock: once shipped, the goods have
      // physically left, so a cancel (return/refund) is restocked manually.
      return done({ status: "cancelled", cancelledAt: nowIso, cancelReason: reason }, [], status === "pending");
    }
    case "notes":
      return done({ internalNotes: str(input.notes, 2000) });
    default:
      return fail("Unknown action", 400);
  }
}
