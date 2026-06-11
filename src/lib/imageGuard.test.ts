import { describe, it, expect } from "vitest";
import { detectImageType, validateImageBuffer } from "./imageGuard";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP_BYTES = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
const GARBAGE = Buffer.from("HELLOWORLDNOTANIMAGE");

describe("detectImageType", () => {
  it("detects PNG by magic bytes", () => {
    expect(detectImageType(PNG_BYTES)).toBe("png");
  });
  it("detects JPEG by magic bytes", () => {
    expect(detectImageType(JPEG_BYTES)).toBe("jpeg");
  });
  it("detects WEBP by magic bytes", () => {
    expect(detectImageType(WEBP_BYTES)).toBe("webp");
  });
  it("returns null for non-image buffers", () => {
    expect(detectImageType(GARBAGE)).toBeNull();
  });
  it("returns null for empty buffer", () => {
    expect(detectImageType(Buffer.from([]))).toBeNull();
  });
});

describe("validateImageBuffer", () => {
  it("accepts a valid PNG within size limit", () => {
    expect(validateImageBuffer(PNG_BYTES, { maxBytes: 1000 }).ok).toBe(true);
  });
  it("rejects a buffer that is not an image", () => {
    expect(validateImageBuffer(GARBAGE, { maxBytes: 1000 }).ok).toBe(false);
  });
  it("rejects a buffer that exceeds size limit", () => {
    const big = Buffer.alloc(10_000, 0x89);
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47;
    big[4] = 0x0d; big[5] = 0x0a; big[6] = 0x1a; big[7] = 0x0a;
    expect(validateImageBuffer(big, { maxBytes: 1000 }).ok).toBe(false);
  });
});
