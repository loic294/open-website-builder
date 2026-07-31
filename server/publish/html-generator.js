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

function buildPageHtml({ title, bodyHtml, siteConfig = {} }) {
  const safeTitle = `${String(title || "Website")}${String(siteConfig?.pageTitle || "")}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const analyticsScript = String(siteConfig?.analyticsScript || "").trim();

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
    <script type="module" src="./published.js"></script>
  </head>
  <body>
    <div class="website">
      ${bodyHtml}
    </div>
    ${analyticsScript}
  </body>
</html>`;
}

export async function generatePageHtml({
  pageConfig,
  siteConfig = {},
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
      siteConfig,
    }),
    warnings,
  };
}
