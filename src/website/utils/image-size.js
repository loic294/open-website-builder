export const IMAGE_SIZE_OPTIONS = [
  { label: "Original", value: "original" },
  { label: "Thumbnail (360px)", value: "thumb" },
  { label: "Small (1920px)", value: "small" },
  { label: "High resolution (3600px)", value: "hires" },
];

export function getImageSize(value, fallback = "original") {
  return value === "original" ||
    value === "thumb" ||
    value === "small" ||
    value === "hires"
    ? value
    : fallback;
}

export function getImageUrlForSize(url, size) {
  const sourceUrl = String(url || "");
  if (!sourceUrl.startsWith("/images/") || !size || size === "original") {
    return sourceUrl;
  }

  const suffixIndex = sourceUrl.search(/[?#]/);
  const path = suffixIndex >= 0 ? sourceUrl.slice(0, suffixIndex) : sourceUrl;
  const suffix = suffixIndex >= 0 ? sourceUrl.slice(suffixIndex) : "";
  return `${path}_${size}.jpg${suffix}`;
}
