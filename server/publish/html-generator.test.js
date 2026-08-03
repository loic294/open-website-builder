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

test("injects page HTML at the end of the head and body", async () => {
  const headHtml = '<meta name="custom-head" content="raw&value" />';
  const bodyHtml =
    "<script data-custom-body>window.customBody = true;</script>";
  const { html } = await generatePageHtml({
    pageConfig: {
      title: "Code injection test",
      headHtml,
      bodyHtml,
      content: [],
    },
  });

  assert.ok(html.indexOf(headHtml) < html.indexOf("</head>"));
  assert.ok(html.indexOf(bodyHtml) < html.indexOf("</body>"));
  assert.ok(html.includes(`    ${headHtml}\n  </head>`));
  assert.ok(html.includes(`    ${bodyHtml}\n  </body>`));
});
