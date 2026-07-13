import { describe, it, expect } from "vitest";
import { applyOrderAction } from "./orderActions";

const NOW = "2026-07-13T10:00:00.000Z";

const pending = { status: "pending" };
const shipped = { status: "shipped", trackingCourier: "JNE", trackingNumber: "RESI123" };
const cancelled = { status: "cancelled", cancelReason: "stok habis" };

describe("applyOrderAction", () => {
  describe("verify", () => {
    it("marks payment verified with a timestamp", () => {
      const r = applyOrderAction(pending, { action: "verify" }, NOW);
      expect(r).toEqual({ ok: true, update: { paymentVerified: true, paymentVerifiedAt: NOW }, remove: [], restock: false });
    });

    it("rejects on a cancelled order", () => {
      const r = applyOrderAction(cancelled, { action: "verify" }, NOW);
      expect(r).toMatchObject({ ok: false, status: 409 });
    });
  });

  describe("ship", () => {
    it("sets status, timestamp and tracking info", () => {
      const r = applyOrderAction(pending, { action: "ship", courier: " JNE ", resi: " R1 " }, NOW);
      expect(r).toEqual({
        ok: true,
        update: { status: "shipped", shippedAt: NOW, trackingCourier: "JNE", trackingNumber: "R1" },
        remove: [],
        restock: false,
      });
    });

    it("requires courier and resi", () => {
      expect(applyOrderAction(pending, { action: "ship", courier: "JNE" }, NOW)).toMatchObject({ ok: false, status: 400 });
      expect(applyOrderAction(pending, { action: "ship", resi: "R1" }, NOW)).toMatchObject({ ok: false, status: 400 });
    });

    it("rejects when already shipped or cancelled", () => {
      expect(applyOrderAction(shipped, { action: "ship", courier: "JNE", resi: "R1" }, NOW)).toMatchObject({ ok: false, status: 409 });
      expect(applyOrderAction(cancelled, { action: "ship", courier: "JNE", resi: "R1" }, NOW)).toMatchObject({ ok: false, status: 409 });
    });
  });

  describe("undo", () => {
    it("returns to pending and clears tracking fields", () => {
      const r = applyOrderAction(shipped, { action: "undo" }, NOW);
      expect(r).toEqual({
        ok: true,
        update: { status: "pending", shippedAt: null },
        remove: ["trackingCourier", "trackingNumber"],
        restock: false,
      });
    });

    it("rejects unless the order is shipped", () => {
      expect(applyOrderAction(pending, { action: "undo" }, NOW)).toMatchObject({ ok: false, status: 409 });
      expect(applyOrderAction(cancelled, { action: "undo" }, NOW)).toMatchObject({ ok: false, status: 409 });
    });
  });

  describe("cancel", () => {
    it("cancels a pending order and restocks it", () => {
      const r = applyOrderAction(pending, { action: "cancel", reason: "customer batal" }, NOW);
      expect(r).toEqual({
        ok: true,
        update: { status: "cancelled", cancelledAt: NOW, cancelReason: "customer batal" },
        remove: [],
        restock: true,
      });
    });

    it("cancels a shipped order WITHOUT restocking", () => {
      const r = applyOrderAction(shipped, { action: "cancel", reason: "retur" }, NOW);
      expect(r).toMatchObject({ ok: true, restock: false });
    });

    it("requires a reason", () => {
      expect(applyOrderAction(pending, { action: "cancel", reason: "  " }, NOW)).toMatchObject({ ok: false, status: 400 });
    });

    it("rejects a double cancel", () => {
      expect(applyOrderAction(cancelled, { action: "cancel", reason: "lagi" }, NOW)).toMatchObject({ ok: false, status: 409 });
    });
  });

  describe("notes", () => {
    it("saves trimmed notes in any status", () => {
      for (const cur of [pending, shipped, cancelled]) {
        const r = applyOrderAction(cur, { action: "notes", notes: " hati-hati fragile " }, NOW);
        expect(r).toEqual({ ok: true, update: { internalNotes: "hati-hati fragile" }, remove: [], restock: false });
      }
    });

    it("caps notes length at 2000 chars", () => {
      const r = applyOrderAction(pending, { action: "notes", notes: "x".repeat(3000) }, NOW);
      expect(r).toMatchObject({ ok: true, update: { internalNotes: "x".repeat(2000) } });
    });
  });

  it("rejects unknown actions", () => {
    expect(applyOrderAction(pending, { action: "nuke" }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(applyOrderAction(pending, {}, NOW)).toMatchObject({ ok: false, status: 400 });
  });

  it("treats an unknown stored status as pending", () => {
    const r = applyOrderAction({ status: "???" }, { action: "cancel", reason: "r" }, NOW);
    expect(r).toMatchObject({ ok: true, restock: true });
  });
});
