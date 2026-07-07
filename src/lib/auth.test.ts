import { describe, it, expect } from "vitest";
import { signToken, verifyToken, DEFAULT_MAX_AGE_SECONDS } from "./auth";

const SECRET = "test-secret-do-not-use-in-prod";
const NOW = 1_700_000_000;

describe("signToken / verifyToken", () => {
  it("round-trips a valid payload", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    const result = verifyToken(token, SECRET, { nowSeconds: NOW });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload).toEqual({ user: "admin", iat: NOW });
  });

  it("rejects when signature is forged", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    const [payloadB64] = token.split(".");
    const forged = `${payloadB64}.YmFkc2lnbg`;
    expect(verifyToken(forged, SECRET, { nowSeconds: NOW }).valid).toBe(false);
  });

  it("rejects when signed with a different secret", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    expect(verifyToken(token, "other-secret", { nowSeconds: NOW }).valid).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("garbage", SECRET).valid).toBe(false);
    expect(verifyToken("", SECRET).valid).toBe(false);
    expect(verifyToken("only-one-part", SECRET).valid).toBe(false);
  });

  it("rejects when payload is tampered", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    const [, sig] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ user: "evil", iat: NOW })).toString("base64url");
    const tampered = `${tamperedPayload}.${sig}`;
    expect(verifyToken(tampered, SECRET, { nowSeconds: NOW }).valid).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    const later = NOW + DEFAULT_MAX_AGE_SECONDS + 1;
    expect(verifyToken(token, SECRET, { nowSeconds: later }).valid).toBe(false);
  });

  it("accepts a token that is within the max age", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    const later = NOW + DEFAULT_MAX_AGE_SECONDS - 1;
    expect(verifyToken(token, SECRET, { nowSeconds: later }).valid).toBe(true);
  });

  it("rejects a token issued implausibly in the future", () => {
    const token = signToken({ user: "admin", iat: NOW + 3600 }, SECRET);
    expect(verifyToken(token, SECRET, { nowSeconds: NOW }).valid).toBe(false);
  });

  it("can disable expiry with maxAgeSeconds = 0", () => {
    const token = signToken({ user: "admin", iat: NOW }, SECRET);
    const muchLater = NOW + 10 * DEFAULT_MAX_AGE_SECONDS;
    expect(verifyToken(token, SECRET, { nowSeconds: muchLater, maxAgeSeconds: 0 }).valid).toBe(true);
  });
});
