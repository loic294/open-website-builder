import assert from "node:assert/strict";
import test from "node:test";

import { getGridItemStyle, renderChildrenWithGrid } from "./publish-utils.js";

test("publishes all flex and grid item properties", () => {
  const style = getGridItemStyle({
    gridColumnStart: 2,
    gridColumnSpan: 3,
    gridRowStart: 1,
    gridRowSpan: 2,
    flexOrder: 4,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "20rem",
    alignSelf: "center",
    justifySelf: "end",
  });

  assert.match(style, /grid-column: 2 \/ span 3/);
  assert.match(style, /grid-row: 1 \/ span 2/);
  assert.match(style, /order: 4/);
  assert.match(style, /flex-grow: 1/);
  assert.match(style, /flex-shrink: 0/);
  assert.match(style, /flex-basis: 20rem/);
  assert.match(style, /align-self: center/);
  assert.match(style, /justify-self: end/);
});

test("publishes responsive child grid positions using child selectors", async () => {
  const html = await renderChildrenWithGrid(
    {
      settings: { settingAlignmentMode: "grid" },
      content: [
        {
          id: "feature-card",
          settings: {
            gridColumnStart: 1,
            gridColumnSpan: 4,
            gridRowStart: 1,
            gridRowSpan: 1,
            responsiveOverrides: {
              mobileVertical: {
                gridColumnStart: 2,
                gridColumnSpan: 1,
              },
            },
          },
        },
      ],
    },
    { renderNode: async () => "<owb-text></owb-text>" },
  );

  assert.match(html, /data-grid-child-id="feature-card"/);
  assert.match(html, /@media \(max-width: 440px\)/);
  assert.match(html, /grid-column: 2 \/ span 1 !important/);
});

test("wraps layout items when flex or grid starts at a breakpoint", async () => {
  const html = await renderChildrenWithGrid(
    {
      settings: {
        settingAlignmentMode: "block",
        responsiveOverrides: {
          tabletVertical: { settingAlignmentMode: "flex" },
        },
      },
      content: [
        {
          id: "responsive-item",
          settings: {
            flexOrder: 2,
            responsiveOverrides: {
              tabletVertical: { alignSelf: "center" },
            },
          },
        },
      ],
    },
    { renderNode: async () => "<owb-text></owb-text>" },
  );

  assert.match(html, /data-grid-child-id="responsive-item"/);
  assert.match(html, /order: 2/);
  assert.match(html, /max-width: 820px.*align-self: center !important/);
});
