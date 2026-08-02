import assert from "node:assert/strict";
import test from "node:test";

import { buildEditorCustomCss } from "./custom-css.js";

test("mirrors max-width media rules for the editor viewport container", () => {
  const css = `h1 { font-size: 200px; }
@media (max-width: 440px) {
  :host { h1 { font-size: 90px; } }
}`;

  const editorCss = buildEditorCustomCss(css, true);

  assert.match(editorCss, /@media \(max-width: 440px\)/);
  assert.match(
    editorCss,
    /@container owb-viewport style\(--owb-responsive-bucket: mobileVertical\).*font-size: 90px/s,
  );
  assert.equal(buildEditorCustomCss(css, false), css);
});
