import sharp from "sharp";
import { extname } from "node:path";
import { extractPhotoMetadata, reverseGeocodeLocation } from "./photo-metadata.js";

const THUMB_SIZE = 360;
const SMALL_SIZE = 1920;
const HIRES_SIZE = 3600;

/**
 * Resize one buffer to a max-longest-side dimension as JPEG.
 * Returns null if the original is already smaller than the target.
 */
function buildLocationSafeExif({ camera, lens }) {
  const ifd0 = {};
  const ifd2 = {};
  if (camera.make) ifd0.Make = camera.make;
  if (camera.model) ifd0.Model = camera.model;
  if (lens.make) ifd2.LensMake = lens.make;
  if (lens.model) ifd2.LensModel = lens.model;
  if (lens.focalLengthMm != null) ifd2.FocalLength = `${Math.round(lens.focalLengthMm * 1000)}/1000`;
  if (lens.aperture != null) ifd2.FNumber = `${Math.round(lens.aperture * 1000)}/1000`;
  if (lens.iso != null) ifd2.ISOSpeedRatings = String(Math.round(lens.iso));

  return {
    ...(Object.keys(ifd0).length ? { IFD0: ifd0 } : {}),
    ...(Object.keys(ifd2).length ? { IFD2: ifd2 } : {}),
  };
}

async function resizeTo(buffer, maxSize, quality = 85, { preserveMetadata, safeExif }) {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);

  const pipeline = img
    .keepGainMap()
    .keepIccProfile()
    .resize(
      (meta.width || 0) >= (meta.height || 0)
        ? { width: Math.min(maxSize, longest), withoutEnlargement: true }
        : { height: Math.min(maxSize, longest), withoutEnlargement: true },
    )
    .jpeg({ quality });

  if (preserveMetadata) {
    pipeline.withMetadata();
  } else if (Object.keys(safeExif).length) {
    pipeline.withExif(safeExif);
  }
  return pipeline.toBuffer();
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
export async function processImage(
  inputBuffer,
  originalFilename,
  { stripLocation = false, resolvePlace = true } = {},
) {
  const img = sharp(inputBuffer);
  const sharpMeta = await img.metadata();
  const photoMetadata = await extractPhotoMetadata(inputBuffer);
  const detectedPlace = resolvePlace
    ? await reverseGeocodeLocation(photoMetadata.originalLocation)
    : null;

  const format =
    sharpMeta.format ||
    extname(originalFilename).replace(".", "").toLowerCase() ||
    "unknown";

  const meta = {
    width: sharpMeta.width || 0,
    height: sharpMeta.height || 0,
    format,
    fileSize: inputBuffer.length,
    camera: photoMetadata.camera,
    lens: photoMetadata.lens,
    originalLocation: photoMetadata.originalLocation,
    place: {
      detected: detectedPlace,
      override: null,
    },
    generatedLocationStripped: stripLocation,
  };

  const [thumb, small, hires] = await Promise.all([
    resizeTo(inputBuffer, THUMB_SIZE, 80, {
      preserveMetadata: !stripLocation,
      safeExif: buildLocationSafeExif(photoMetadata),
    }),
    resizeTo(inputBuffer, SMALL_SIZE, 85, {
      preserveMetadata: !stripLocation,
      safeExif: buildLocationSafeExif(photoMetadata),
    }),
    resizeTo(inputBuffer, HIRES_SIZE, 90, {
      preserveMetadata: !stripLocation,
      safeExif: buildLocationSafeExif(photoMetadata),
    }),
  ]);

  return { meta, versions: { thumb, small, hires } };
}
