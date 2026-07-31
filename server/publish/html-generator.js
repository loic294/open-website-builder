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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveAbsoluteUrl(value, siteUrl) {
  const rawValue = String(value || "").trim();
  const baseUrl = String(siteUrl || "").trim();
  if (!rawValue) return "";
  if (!baseUrl) return rawValue;

  try {
    return new URL(rawValue, `${baseUrl.replace(/\/+$/, "")}/`).href;
  } catch {
    return rawValue;
  }
}

function buildPageHtml({ pageConfig = {}, bodyHtml, siteConfig = {} }) {
  const legacySeo =
    pageConfig?.metadata?.seo && typeof pageConfig.metadata.seo === "object"
      ? pageConfig.metadata.seo
      : {};
  const seo =
    pageConfig?.seo && typeof pageConfig.seo === "object"
      ? pageConfig.seo
      : legacySeo;
  const seoTitle = String(
    seo?.title || pageConfig?.title || pageConfig?.id || "Website",
  );
  const safeTitle = escapeHtml(
    `${seoTitle}${String(siteConfig?.pageTitle || "")}`,
  );
  const description = String(seo?.description || "").trim();
  const canonicalUrl = resolveAbsoluteUrl(
    seo?.canonicalUrl || pageConfig?.url,
    siteConfig?.siteUrl,
  );
  const imageUrl = resolveAbsoluteUrl(seo?.image, siteConfig?.siteUrl);
  const socialTags = [
    `<meta property="og:title" content="${escapeHtml(seoTitle)}" />`,
    description
      ? `<meta property="og:description" content="${escapeHtml(description)}" />`
      : "",
    canonicalUrl
      ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
      : "",
    imageUrl
      ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`
      : "",
    `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(seoTitle)}" />`,
    description
      ? `<meta name="twitter:description" content="${escapeHtml(description)}" />`
      : "",
    imageUrl
      ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");
  const analyticsScript = String(siteConfig?.analyticsScript || "").trim();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/x-icon" href="/images/favicon.png" />
    <title>${safeTitle}</title>
    ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ""}
    ${seo?.noIndex ? '<meta name="robots" content="noindex, nofollow" />' : ""}
    ${canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : ""}
    ${socialTags}
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
      pageConfig,
      bodyHtml,
      siteConfig,
    }),
    warnings,
  };
}
