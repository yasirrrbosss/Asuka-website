import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthorizedAdmin } from "./adminGuard";
import { signToken } from "./auth";

const SECRET = "guard-test-secret";

function reqWith(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/admin/orders", { headers });
}

describe("isAuthorizedAdmin", () => {
  beforeEach(() => { process.env.ADMIN_TOKEN_SECRET = SECRET; });
  afterEach(() => { delete process.env.ADMIN_TOKEN_SECRET; });

  it("accepts a valid Bearer token", () => {
    const token = signToken({ user: "admin", iat: Math.floor(Date.now() / 1000) }, SECRET);
    expect(isAuthorizedAdmin(reqWith(`Bearer ${token}`))).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(isAuthorizedAdmin(reqWith())).toBe(false);
  });

  it("rejects a non-Bearer header", () => {
    const token = signToken({ user: "admin", iat: Math.floor(Date.now() / 1000) }, SECRET);
    expect(isAuthorizedAdmin(reqWith(token))).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signToken({ user: "admin", iat: Math.floor(Date.now() / 1000) }, "other");
    expect(isAuthorizedAdmin(reqWith(`Bearer ${token}`))).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = signToken({ user: "admin", iat: Math.floor(Date.now() / 1000) - 90000 }, SECRET);
    expect(isAuthorizedAdmin(reqWith(`Bearer ${token}`))).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    delete process.env.ADMIN_TOKEN_SECRET;
    const token = signToken({ user: "admin", iat: Math.floor(Date.now() / 1000) }, SECRET);
    expect(isAuthorizedAdmin(reqWith(`Bearer ${token}`))).toBe(false);
  });
});
