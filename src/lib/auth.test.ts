import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./auth";

const SECRET = "test-secret-do-not-use-in-prod";

describe("signToken / verifyToken", () => {
  it("round-trips a valid payload", () => {
    const token = signToken({ user: "admin", iat: 1700000000 }, SECRET);
    const result = verifyToken(token, SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload).toEqual({ user: "admin", iat: 1700000000 });
  });

  it("rejects when signature is forged", () => {
    const token = signToken({ user: "admin", iat: 1700000000 }, SECRET);
    const [payloadB64] = token.split(".");
    const forged = `${payloadB64}.YmFkc2lnbg`;
    expect(verifyToken(forged, SECRET).valid).toBe(false);
  });

  it("rejects when signed with a different secret", () => {
    const token = signToken({ user: "admin", iat: 1700000000 }, SECRET);
    expect(verifyToken(token, "other-secret").valid).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("garbage", SECRET).valid).toBe(false);
    expect(verifyToken("", SECRET).valid).toBe(false);
    expect(verifyToken("only-one-part", SECRET).valid).toBe(false);
  });

  it("rejects when payload is tampered", () => {
    const token = signToken({ user: "admin", iat: 1700000000 }, SECRET);
    const [, sig] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ user: "evil", iat: 1700000000 })).toString("base64url");
    const tampered = `${tamperedPayload}.${sig}`;
    expect(verifyToken(tampered, SECRET).valid).toBe(false);
  });
});
