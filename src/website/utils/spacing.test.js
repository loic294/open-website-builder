import assert from "node:assert/strict";
import test from "node:test";

import { buildResponsiveSpacingCss, getSpacingCss } from "./spacing.js";

test("serializes universal spacing, colors, radius, and visibility", () => {
  assert.equal(
    getSpacingCss({
      settingSpacingPaddingTop: "1rem",
      settingSpacingMarginLeft: "auto",
      settingSpacingBorderRadius: "8px",
      settingSpacingBackgroundColor: "--color-surface",
      settingSpacingTextColor: "--color-text",
      settingSpacingHidden: true,
    }),
    ":host { padding-top: 1rem; margin-left: auto; border-radius: 8px; background-color: var(--color-surface); color: var(--color-text); display: none !important }",
  );
});

test("inherits wider spacing values in narrower media rules", () => {
  const css = buildResponsiveSpacingCss({
    settingSpacingPaddingTop: "2rem",
    settingSpacingMarginLeft: "1rem",
    responsiveOverrides: {
      tabletHorizontal: { settingSpacingPaddingTop: "1rem" },
      mobileVertical: { settingSpacingMarginLeft: "0" },
    },
  });

  assert.match(
    css,
    /max-width: 1180px.*padding-top: 1rem !important.*margin-left: 1rem !important/,
  );
  assert.match(
    css,
    /max-width: 440px.*padding-top: 1rem !important.*margin-left: 0 !important/,
  );
});
