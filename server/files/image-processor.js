import sharp from "sharp";
import { extname } from "node:path";

const THUMB_SIZE = 360;
const SMALL_SIZE = 1920;
const HIRES_SIZE = 3600;

/**
 * Resize one buffer to a max-longest-side dimension as JPEG.
 * Returns null if the original is already smaller than the target.
 */
async function resizeTo(buffer, maxSize, quality = 85) {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);

  return img
    .resize(
      (meta.width || 0) >= (meta.height || 0)
        ? { width: Math.min(maxSize, longest) }
        : { height: Math.min(maxSize, longest) },
      { withoutEnlargement: true },
    )
    .jpeg({ quality })
    .toBuffer();
}

/**
 * Process an image buffer: extract metadata and produce 3 resized JPEG versions.
 *
 * @param {Buffer} inputBuffer - The raw uploaded image bytes.
 * @param {string} originalFilename - Original filename (used to infer format when missing).
 * @returns {{ meta, versions }}
 *   meta: { width, height, format, fileSize }
 *   versions: { thumb, small, hires } — each is a Buffer
 */
export async function processImage(inputBuffer, originalFilename) {
  const img = sharp(inputBuffer);
  const sharpMeta = await img.metadata();

  const format =
    sharpMeta.format ||
    extname(originalFilename).replace(".", "").toLowerCase() ||
    "unknown";

  const meta = {
    width: sharpMeta.width || 0,
    height: sharpMeta.height || 0,
    format,
    fileSize: inputBuffer.length,
  };

  const [thumb, small, hires] = await Promise.all([
    resizeTo(inputBuffer, THUMB_SIZE, 80),
    resizeTo(inputBuffer, SMALL_SIZE, 85),
    resizeTo(inputBuffer, HIRES_SIZE, 90),
  ]);

  return { meta, versions: { thumb, small, hires } };
}
