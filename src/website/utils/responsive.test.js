import assert from "node:assert/strict";
import test from "node:test";

import {
  RESPONSIVE_BUCKET_ORDER,
  buildResponsiveCss,
  getEffectiveSettings,
  normalizeCssDeclarations,
} from "./responsive.js";

test("uses the existing widest-first responsive bucket order", () => {
  assert.deepEqual(RESPONSIVE_BUCKET_ORDER, [
    "tabletHorizontal",
    "mobileHorizontal",
    "tabletVertical",
    "mobileVertical",
  ]);
});

test("merges all wider overrides into a narrower effective setting", () => {
  const settings = {
    gap: "24px",
    columns: 4,
    responsiveOverrides: {
      tabletHorizontal: { gap: "16px" },
      tabletVertical: { columns: 2 },
    },
  };

  assert.deepEqual(getEffectiveSettings(settings, "tabletVertical"), {
    gap: "16px",
    columns: 2,
  });
  assert.deepEqual(getEffectiveSettings(settings, "mobileVertical"), {
    gap: "16px",
    columns: 2,
  });
});

test("builds media rules from cumulative settings without viewport JavaScript", () => {
  const css = buildResponsiveCss(
    {
      gap: "24px",
      columns: 4,
      responsiveOverrides: {
        tabletHorizontal: { gap: "16px" },
        tabletVertical: { columns: 2 },
      },
    },
    (settings) => ({
      selector: ".grid",
      declarations: {
        gap: settings.gap,
        "grid-template-columns": `repeat(${settings.columns}, 1fr)`,
      },
    }),
  );

  assert.match(
    css,
    /@media \(max-width: 1180px\).*gap: 16px !important.*repeat\(4, 1fr\)/,
  );
  assert.match(
    css,
    /@media \(max-width: 820px\).*gap: 16px !important.*repeat\(2, 1fr\)/,
  );
  assert.doesNotMatch(css, /max-width: 844px/);
});

test("preserves existing important declarations", () => {
  assert.equal(
    normalizeCssDeclarations(["display: none !important", "gap: 8px"], true),
    "display: none !important; gap: 8px !important",
  );
});
