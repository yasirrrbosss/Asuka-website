import { describe, it, expect } from "vitest";
import { validateWhatsApp, validateName, validateAddress } from "./validation";

describe("validateWhatsApp", () => {
  it("accepts a valid 08 number with 10 digits", () => {
    expect(validateWhatsApp("0812345678")).toEqual({ ok: true });
  });
  it("accepts a valid 08 number with 13 digits", () => {
    expect(validateWhatsApp("0812345678901")).toEqual({ ok: true });
  });
  it("accepts +62 prefix", () => {
    expect(validateWhatsApp("+62812345678")).toEqual({ ok: true });
  });
  it("rejects empty string", () => {
    expect(validateWhatsApp("").ok).toBe(false);
  });
  it("rejects number not starting with 08 or +62", () => {
    expect(validateWhatsApp("12345678901").ok).toBe(false);
  });
  it("rejects too short", () => {
    expect(validateWhatsApp("0812").ok).toBe(false);
  });
  it("rejects too long", () => {
    expect(validateWhatsApp("08123456789012345").ok).toBe(false);
  });
  it("strips whitespace and dashes for matching", () => {
    expect(validateWhatsApp("0812-3456-7890")).toEqual({ ok: true });
  });
});

describe("validateName", () => {
  it("accepts a normal name", () => {
    expect(validateName("Budi Santoso")).toEqual({ ok: true });
  });
  it("rejects empty", () => {
    expect(validateName("").ok).toBe(false);
  });
  it("rejects 1-char", () => {
    expect(validateName("A").ok).toBe(false);
  });
  it("trims before measuring", () => {
    expect(validateName("  A  ").ok).toBe(false);
  });
});

describe("validateAddress", () => {
  it("accepts a normal address", () => {
    expect(validateAddress("Jl. Mawar No. 12, Jakarta")).toEqual({ ok: true });
  });
  it("rejects empty", () => {
    expect(validateAddress("").ok).toBe(false);
  });
  it("rejects under 10 chars", () => {
    expect(validateAddress("Short").ok).toBe(false);
  });
});
