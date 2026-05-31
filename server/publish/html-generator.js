import "@lit-labs/ssr/lib/install-global-dom-shim.js";

import { publishRenderers } from "./publish-renderers.js";

async function renderNode(node, context) {
  if (!node || typeof node !== "object") return "";

  const renderer = publishRenderers.get(node.type);
  if (!renderer) {
    context.warnings.push(
      `Unsupported node type: ${String(node.type || "unknown")}`,
    );
    return "";
  }

  return await renderer(node, context);
}

async function renderNodes(nodes, context) {
  const items = Array.isArray(nodes) ? nodes : [];
  const rendered = [];
  for (const node of items) {
    const html = await renderNode(node, context);
    if (html) rendered.push(html);
  }
  return rendered.join("\n");
}

function buildPageHtml({ title, bodyHtml }) {
  const safeTitle = String(title || "Website")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/x-icon" href="/images/favicon.png" />
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="https://use.typekit.net/fsb3crk.css" />
    <link rel="stylesheet" href="./theme.css" />
    <link rel="stylesheet" href="./base.css" />
  </head>
  <body>
    <div class="website">
      ${bodyHtml}
    </div>
    <script type="module" src="./published.js"></script>
    <script type="module" src="./publish-runtime.js"></script>
    <script defer src="https://analytics.loicbellemarealford.ca/script.js" data-website-id="7653ba01-64a9-4d8c-8b9d-8d623c194126" data-domains="loicbellemarealford.ca" data-performance="true" data-do-not-track="true"></script>
  </body>
</html>`;
}

export async function generatePageHtml({
  pageConfig,
  loadSharedComponent,
  loadCollectionConfig,
  loadCollectionItemsMetadata,
  tokenValues = {},
  collectionItemContent = [],
}) {
  const warnings = [];
  const context = {
    warnings,
    loadSharedComponent,
    loadCollectionConfig,
    loadCollectionItemsMetadata,
    sharedStack: new Set(),
    tokenValues,
    collectionItemContent,
    pageUrl: pageConfig?.url || "",
    renderNode,
    renderNodes,
  };

  const bodyHtml = await renderNodes(pageConfig?.content, context);

  return {
    html: buildPageHtml({
      title: pageConfig?.title || pageConfig?.id || "Website",
      bodyHtml,
    }),
    warnings,
  };
}
