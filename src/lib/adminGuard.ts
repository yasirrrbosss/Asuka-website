import { verifyToken } from "./auth";

/**
 * Authorize an admin request. The dashboard sends its signed session token as
 * `Authorization: Bearer <token>`; we verify the HMAC signature and expiry
 * server-side. Returns true only for a valid, unexpired admin token.
 */
export function isAuthorizedAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_TOKEN_SECRET ?? "";
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  return verifyToken(token, secret).valid;
}
