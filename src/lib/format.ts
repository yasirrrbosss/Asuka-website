export const rp = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// Firestore document field hard limit is ~1,048,487 bytes. Base64 inflates raw
// bytes by ~4/3, so the encoded payment proof must stay under ~780KB to fit.
const MAX_PROOF_BASE64_BYTES = 900_000;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Resize + re-encode an image File to a JPEG data URL that fits within
 * Firestore's per-field size limit. Iteratively lowers JPEG quality until
 * the output is small enough; returns the final data URL.
 */
export const compressImageForUpload = async (file: File): Promise<string> => {
  const raw = await fileToBase64(file);
  if (raw.length <= MAX_PROOF_BASE64_BYTES) return raw;

  const img = await loadImage(raw);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  for (const q of [0.85, 0.72, 0.6, 0.5, 0.4]) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (out.length <= MAX_PROOF_BASE64_BYTES) return out;
  }
  throw new Error("Image too complex to compress within size limit");
};
