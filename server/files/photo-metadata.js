import exifr from "exifr";

const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let nextGeocodeAt = 0;

function cleanString(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\0/g, "").trim();
  return cleaned || null;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function extractPhotoMetadata(buffer) {
  let exif = null;
  try {
    exif = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      interop: false,
      ifd1: false,
    });
  } catch {
    // Images without readable EXIF still upload normally.
  }

  const originalLocation = exif && Number.isFinite(exif.latitude) && Number.isFinite(exif.longitude)
    ? { latitude: exif.latitude, longitude: exif.longitude }
    : null;

  return {
    camera: {
      make: cleanString(exif?.Make),
      model: cleanString(exif?.Model),
    },
    lens: {
      make: cleanString(exif?.LensMake),
      model: cleanString(exif?.LensModel),
      focalLengthMm: finiteNumber(exif?.FocalLength),
      aperture: finiteNumber(exif?.FNumber),
      iso: finiteNumber(exif?.ISO ?? exif?.ISOSpeedRatings ?? exif?.PhotographicSensitivity),
    },
    originalLocation,
  };
}

export async function reverseGeocodeLocation(originalLocation) {
  if (!originalLocation) return null;

  const cacheKey = `${originalLocation.latitude.toFixed(5)},${originalLocation.longitude.toFixed(5)}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  const lookup = geocodeQueue.then(async () => {
    const waitMs = Math.max(0, nextGeocodeAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextGeocodeAt = Date.now() + 1100;
    return fetchReverseGeocode(originalLocation);
  });
  geocodeQueue = lookup.catch(() => null);
  geocodeCache.set(cacheKey, lookup);
  return lookup;
}

async function fetchReverseGeocode(originalLocation) {

  const params = new URLSearchParams({
    lat: String(originalLocation.latitude),
    lon: String(originalLocation.longitude),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "10",
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "open-website-builder/0.1",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const { address = {} } = await response.json();
    return {
      city: cleanString(address.city || address.town || address.village || address.municipality || address.hamlet),
      stateProvince: cleanString(address.state || address.province || address.region),
      country: cleanString(address.country),
    };
  } catch {
    return null;
  }
}
