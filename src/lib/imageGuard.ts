export type ImageType = "png" | "jpeg" | "webp" | "gif";

export function detectImageType(buf: Buffer): ImageType | null {
  if (buf.length < 4) return null;
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) return "webp";
  if (buf.length >= 6 && buf.toString("ascii", 0, 6).startsWith("GIF8")) return "gif";
  return null;
}

export interface ValidateOpts { maxBytes: number; }
export type ValidateResult = { ok: true; type: ImageType } | { ok: false; reason: string };

export function validateImageBuffer(buf: Buffer, opts: ValidateOpts): ValidateResult {
  if (buf.length > opts.maxBytes) {
    return { ok: false, reason: `Image exceeds ${opts.maxBytes} bytes` };
  }
  const type = detectImageType(buf);
  if (!type) return { ok: false, reason: "Not a recognized image format (PNG/JPEG/WebP/GIF)" };
  return { ok: true, type };
}

/**
 * Decode a base64 data URL or raw base64 string into a Buffer.
 * Useful for validating payment proofs that arrive as base64 strings.
 */
export function decodeBase64Image(input: string): Buffer | null {
  if (!input) return null;
  const match = input.match(/^data:image\/[a-z]+;base64,(.+)$/);
  const b64 = match ? match[1] : input;
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}
