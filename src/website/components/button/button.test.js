import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResponsiveButtonCss,
  getButtonVisualDeclarations,
} from "./button.js";

test("serializes all button appearance families", () => {
  const declarations = getButtonVisualDeclarations({
    buttonSize: "custom",
    buttonPaddingTop: "1px",
    buttonPaddingRight: "2px",
    buttonPaddingBottom: "3px",
    buttonPaddingLeft: "4px",
    buttonTheme: "secondary",
    buttonVariant: "border",
    buttonShape: "custom",
    buttonRadiusCustom: "6px",
  }).join("; ");

  assert.match(declarations, /padding: 1px 2px 3px 4px/);
  assert.match(declarations, /website-secondary-color/);
  assert.match(declarations, /background: transparent/);
  assert.match(declarations, /border-radius: 6px/);
});

test("generates responsive button CSS from cumulative overrides", () => {
  const css = buildResponsiveButtonCss({
    buttonSize: "l",
    buttonTheme: "primary",
    responsiveOverrides: {
      tabletHorizontal: { buttonSize: "sm" },
      mobileVertical: { buttonTheme: "dark", buttonShape: "square" },
    },
  });

  assert.match(css, /max-width: 1180px.*button-font-size: 0\.85rem/);
  assert.match(
    css,
    /max-width: 440px.*button-font-size: 0\.85rem.*website-dark-color.*border-radius: 0px/,
  );
});
