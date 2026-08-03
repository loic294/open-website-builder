import assert from "node:assert/strict";
import test from "node:test";

import { buildResponsiveGalleryCss, getGalleryLayout } from "./gallery.js";

test("normalizes gallery layouts with grid as the fallback", () => {
  assert.equal(getGalleryLayout("masonry"), "masonry");
  assert.equal(getGalleryLayout("grid"), "grid");
  assert.equal(getGalleryLayout(undefined), "grid");
  assert.equal(getGalleryLayout("unknown"), "grid");
});

test("generates responsive gallery columns and gaps", () => {
  const css = buildResponsiveGalleryCss({
    galleryColumns: 4,
    galleryGap: "12px",
    galleryFormat: "3 / 2",
    responsiveOverrides: {
      tabletHorizontal: { galleryColumns: 3 },
      mobileVertical: { galleryColumns: 1, galleryGap: "4px" },
    },
  });

  assert.match(css, /max-width: 1180px.*--gallery-columns: 3/);
  assert.match(
    css,
    /max-width: 440px.*--gallery-columns: 1.*--gallery-gap: 4px/,
  );
});
