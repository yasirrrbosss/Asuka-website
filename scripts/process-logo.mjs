import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "public", "images", "hero-logo.png");
const OUT_CREAM = path.join(__dirname, "..", "public", "images", "logo-cream.png");
const OUT_DARK = path.join(__dirname, "..", "public", "images", "logo-dark.png");

const BG_LUMA_THRESHOLD = 90;
const DARK_R = 0x1f, DARK_G = 0x35, DARK_B = 0x20;

async function process(srcPath, outPath, recolorTo) {
  const img = sharp(srcPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma < BG_LUMA_THRESHOLD) {
      out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 0;
    } else if (recolorTo) {
      const alpha = Math.min(255, Math.round(((luma - BG_LUMA_THRESHOLD) / (255 - BG_LUMA_THRESHOLD)) * 255));
      out[i] = recolorTo.r; out[i + 1] = recolorTo.g; out[i + 2] = recolorTo.b; out[i + 3] = alpha;
    } else {
      const alpha = Math.min(255, Math.round(((luma - BG_LUMA_THRESHOLD) / (255 - BG_LUMA_THRESHOLD)) * 255));
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = alpha;
    }
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log(`wrote ${outPath}`);
}

await process(SRC, OUT_CREAM, null);
await process(SRC, OUT_DARK, { r: DARK_R, g: DARK_G, b: DARK_B });
console.log("done");
