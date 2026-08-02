import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResponsiveLayoutItemCss,
  getLayoutItemDeclarations,
} from "./layout-item.js";

test("serializes grid placement and flex/grid item properties", () => {
  assert.deepEqual(
    getLayoutItemDeclarations({
      gridColumnStart: 2,
      gridColumnSpan: 3,
      gridRowStart: 4,
      gridRowSpan: 2,
      flexOrder: 1,
      flexGrow: 2,
      flexShrink: 0,
      flexBasis: "12rem",
      alignSelf: "center",
      justifySelf: "end",
      gridArea: "feature",
    }),
    [
      "grid-column: 2 / span 3",
      "grid-row: 4 / span 2",
      "order: 1",
      "flex-grow: 2",
      "flex-shrink: 0",
      "flex-basis: 12rem",
      "align-self: center",
      "justify-self: end",
      "grid-area: feature",
    ],
  );
});

test("builds cumulative responsive grid positions", () => {
  const css = buildResponsiveLayoutItemCss(
    {
      gridColumnStart: 1,
      gridColumnSpan: 4,
      gridRowStart: 1,
      gridRowSpan: 1,
      alignSelf: "start",
      justifySelf: "end",
      responsiveOverrides: {
        tabletHorizontal: { gridColumnSpan: 2, alignSelf: "center" },
        mobileVertical: { gridColumnStart: 2, justifySelf: "stretch" },
      },
    },
    '[data-grid-child-id="hero"]',
  );

  assert.match(css, /max-width: 1180px.*grid-column: 1 \/ span 2/);
  assert.match(css, /max-width: 1180px.*align-self: center/);
  assert.match(css, /max-width: 440px.*grid-column: 2 \/ span 2/);
  assert.match(
    css,
    /max-width: 440px.*align-self: center.*justify-self: stretch/,
  );
});
