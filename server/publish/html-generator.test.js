import assert from "node:assert/strict";
import test from "node:test";

import { generatePageHtml } from "./html-generator.js";

test("renders component content into declarative shadow roots", async () => {
  const { html } = await generatePageHtml({
    pageConfig: {
      title: "SSR test",
      content: [
        {
          type: "section",
          settings: {},
          content: [
            {
              type: "text",
              content: "<p>Rendered before JavaScript</p>",
              settings: {},
            },
          ],
        },
      ],
    },
  });

  assert.equal((html.match(/shadowrootmode="open"/g) || []).length, 2);
  assert.match(html, /<p>Rendered before JavaScript<\/p>/);
  assert.match(html, /class="owb-loading"/);
  assert.match(html, /rel="modulepreload" href="\.\/published\.js"/);
});