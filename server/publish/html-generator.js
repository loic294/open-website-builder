import "@lit-labs/ssr/lib/install-global-dom-shim.js";
import { render as ssrRender } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html as litHtml } from "lit";

import { OwbButton } from "../../src/website/components/button/button.js";
import { OwbText } from "../../src/website/components/text/text.js";
import { OwbImage } from "../../src/website/components/image/image.js";
import { OwbEmbed } from "../../src/website/components/embed/embed.js";
import { OwbGallery } from "../../src/website/components/gallery/gallery.js";
import { OwbSlider } from "../../src/website/components/slider/slider.js";
import { OwbSocialMedia } from "../../src/website/components/social-media/social-media.js";
import { OwbNavbar } from "../../src/website/components/navbar/navbar.js";
import { OwbSection } from "../../src/website/components/site-section/section.js";
import { OwbContainer } from "../../src/website/components/container/container.js";
import { OwbForm } from "../../src/website/components/form/form.js";
import * as simpleIcons from "simple-icons";

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}

if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}

if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}

if (!customElements.get("owb-social-media")) {
  customElements.define("owb-social-media", OwbSocialMedia);
}

if (!customElements.get("owb-navbar")) {
  customElements.define("owb-navbar", OwbNavbar);
}

if (!customElements.get("owb-section")) {
  customElements.define("owb-section", OwbSection);
}

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}

if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

const LEGACY_ICON_VALUE_MAP = {
  twitter: "x",
  linkedin: "linkedin",
  github: "github",
  instagram: "instagram",
  youtube: "youtube",
  facebook: "facebook",
  tiktok: "tiktok",
  globe: "",
  custom: "",
};

const SIMPLE_ICON_LIBRARY = Object.values(simpleIcons)
  .filter(
    (icon) =>
      icon &&
      typeof icon === "object" &&
      typeof icon.slug === "string" &&
      typeof icon.title === "string" &&
      typeof icon.svg === "string",
  )
  .map((icon) => ({
    slug: icon.slug,
    title: icon.title,
    svg: icon.svg,
    hex: icon.hex,
  }));

const SIMPLE_ICON_MAP = new Map(
  SIMPLE_ICON_LIBRARY.map((icon) => [icon.slug, icon]),
);

const BASE_DYNAMIC_FIELDS = [
  "title",
  "excerpt",
  "tags",
  "url",
  "sourceUrl",
  "featuredImageUrl",
  "publishedAt",
  "categories",
];

function normalizeIconSlug(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (!raw) {
    return "";
  }

  if (raw in LEGACY_ICON_VALUE_MAP) {
    return LEGACY_ICON_VALUE_MAP[raw];
  }

  return raw;
}

function configScript(obj) {
  return `<script type="application/json" data-owb-config>${JSON.stringify(obj)}</script>`;
}

function replaceTemplateTokens(value, tokenValues = {}) {
  if (!value) {
    return String(value ?? "");
  }

  return String(value).replace(
    /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g,
    (match, rawKey) => {
      const key = String(rawKey || "").trim();
      if (!key) {
        return match;
      }

      const exact = tokenValues[key];
      if (exact !== undefined && exact !== null) {
        return String(exact);
      }

      const upper = tokenValues[key.toUpperCase()];
      if (upper !== undefined && upper !== null) {
        return String(upper);
      }

      return match;
    },
  );
}

function applyTokensToJson(value, tokenValues = {}) {
  if (typeof value === "string") {
    return replaceTemplateTokens(value, tokenValues);
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyTokensToJson(item, tokenValues));
  }

  if (value && typeof value === "object") {
    const next = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      next[key] = applyTokensToJson(nestedValue, tokenValues);
    }
    return next;
  }

  return value;
}

function getValueByPath(value, path) {
  const segments = String(path || "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current = value;
  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function normalizePathTokenValue(value) {
  return String(value || "")
    .trim()
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function getTokenValueMap(metadata = {}, allowlist = []) {
  const tokenValues = {};
  const dynamicFields = [...new Set([...BASE_DYNAMIC_FIELDS, ...allowlist])];

  for (const fieldName of dynamicFields) {
    const normalized = String(fieldName || "").trim();
    if (!normalized) {
      continue;
    }

    const value =
      metadata?.[normalized] ??
      getValueByPath(metadata?.metadata, normalized) ??
      getValueByPath(metadata, normalized);

    if (normalized === "url" || normalized === "sourceUrl") {
      const pathValue = normalizePathTokenValue(value);
      if (pathValue) {
        tokenValues[normalized] = pathValue;
        tokenValues[normalized.toUpperCase()] = pathValue;
      }
      continue;
    }

    if (Array.isArray(value)) {
      const joined = value.map((item) => String(item || "")).join(", ");
      tokenValues[normalized] = joined;
      tokenValues[normalized.toUpperCase()] = joined;
      continue;
    }

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      continue;
    }

    tokenValues[normalized] = String(value);
    tokenValues[normalized.toUpperCase()] = String(value);
  }

  return tokenValues;
}

function getSortedCollectionItems(items = [], sortMode = "disk") {
  const next = [...items];
  if (sortMode === "title-asc") {
    next.sort((a, b) =>
      String(a?.title || "").localeCompare(String(b?.title || "")),
    );
    return next;
  }

  if (sortMode === "title-desc") {
    next.sort((a, b) =>
      String(b?.title || "").localeCompare(String(a?.title || "")),
    );
    return next;
  }

  if (sortMode === "id-asc") {
    next.sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || "")));
    return next;
  }

  if (sortMode === "id-desc") {
    next.sort((a, b) => String(b?.id || "").localeCompare(String(a?.id || "")));
    return next;
  }

  if (sortMode === "publishedAt-desc") {
    next.sort(
      (a, b) =>
        new Date(b?.metadata?.metadata?.publishedAt || 0).getTime() -
        new Date(a?.metadata?.metadata?.publishedAt || 0).getTime(),
    );
    return next;
  }

  if (sortMode === "publishedAt-asc") {
    next.sort(
      (a, b) =>
        new Date(a?.metadata?.metadata?.publishedAt || 0).getTime() -
        new Date(b?.metadata?.metadata?.publishedAt || 0).getTime(),
    );
    return next;
  }

  return next;
}

async function renderText(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { content: node?.content ?? "", settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-text
      .content=${payload.content}
      .settings=${payload.settings}
    ></owb-text>`,
  );
  return await collectResult(ssrResult);
}

async function renderImage(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { url: node?.url ?? "", settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-image
      .url=${payload.url}
      .settings=${payload.settings}
    ></owb-image>`,
  );
  return await collectResult(ssrResult);
}

async function renderButton(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { content: node?.content ?? "Button", settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-button
      .content=${payload.content}
      .settings=${payload.settings}
    ></owb-button>`,
  );
  return await collectResult(ssrResult);
}

async function renderEmbed(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { html: node?.html ?? "", settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-embed .html=${payload.html} .settings=${payload.settings}></owb-embed>`,
  );
  return await collectResult(ssrResult);
}

async function renderSocialMedia(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { items: node?.items ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-social-media .items=${payload.items} .settings=${payload.settings}></owb-social-media>`,
  );
  return await collectResult(ssrResult);
}

async function renderGallery(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { images: node?.images ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-gallery .images=${payload.images} .settings=${payload.settings}></owb-gallery>`,
  );
  return await collectResult(ssrResult);
}

async function renderSlider(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { images: node?.images ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-slider .images=${payload.images} .settings=${payload.settings}></owb-slider>`,
  );
  return await collectResult(ssrResult);
}

async function renderNavbar(node, context) {
  const tokenValues = context?.tokenValues || {};
  const currentPath = context?.pageUrl || "";
  const payload = applyTokensToJson(
    { links: node?.links ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  const ssrResult = ssrRender(
    litHtml`<owb-navbar .links=${payload.links} .settings=${payload.settings} .currentPath=${currentPath}></owb-navbar>`,
  );
  return await collectResult(ssrResult);
}

async function renderShared(node, context) {
  const componentId = String(node?.settings?.shared_component_id || "").trim();
  if (!componentId) {
    context.warnings.push("Shared component is missing shared_component_id");
    return "";
  }

  if (context.sharedStack.has(componentId)) {
    context.warnings.push(
      `Detected circular shared component reference: ${componentId}`,
    );
    return "";
  }

  const componentConfig = await context.loadSharedComponent(componentId);
  if (!componentConfig) {
    context.warnings.push(`Shared component not found: ${componentId}`);
    return "";
  }

  context.sharedStack.add(componentId);
  const rendered = await renderNodes(componentConfig.content, context);
  context.sharedStack.delete(componentId);
  return rendered;
}

function getGridItemStyle(settings = {}) {
  const columnStart = Number.parseInt(settings.gridColumnStart, 10);
  const rowStart = Number.parseInt(settings.gridRowStart, 10);
  const columnSpan = Number.parseInt(settings.gridColumnSpan, 10);
  const rowSpan = Number.parseInt(settings.gridRowSpan, 10);

  const parts = [];
  if (Number.isFinite(columnStart) && Number.isFinite(columnSpan)) {
    parts.push(`grid-column: ${columnStart} / span ${Math.max(1, columnSpan)}`);
  }
  if (Number.isFinite(rowStart) && Number.isFinite(rowSpan)) {
    parts.push(`grid-row: ${rowStart} / span ${Math.max(1, rowSpan)}`);
  }

  // Keep the wrapper as a proper stacking context target for overlapping grid items.
  parts.push("position: relative");
  parts.push("min-width: 0");
  parts.push("min-height: 0");

  const hostZIndex = getHostZIndexFromCustomCss(settings);
  if (hostZIndex) {
    parts.push(`z-index: ${hostZIndex}`);
  }

  return parts.join("; ");
}

function getHostZIndexFromCustomCss(settings = {}) {
  const customCss = String(settings.customCss || "");
  if (!customCss) {
    return "";
  }

  const hostRuleMatch = customCss.match(/:host\s*\{([\s\S]*?)\}/i);
  if (!hostRuleMatch) {
    return "";
  }

  const zIndexMatch = hostRuleMatch[1]?.match(/z-index\s*:\s*([^;\n\r}]+)/i);
  return zIndexMatch?.[1]?.trim() || "";
}

async function renderSection(node, context) {
  const settings = node?.settings ?? {};
  const alignmentMode = String(settings.settingAlignmentMode || "block");
  const isGridMode = alignmentMode === "grid" || alignmentMode === "visual";
  const children = Array.isArray(node?.content) ? node.content : [];
  const renderedChildren = [];

  for (const child of children) {
    const childHtml = await renderNode(child, context);
    if (!childHtml) continue;

    if (isGridMode) {
      const style = getGridItemStyle(child?.settings ?? {});
      renderedChildren.push(
        `<div style="${escapeAttr(style)}">${childHtml}</div>`,
      );
    } else {
      renderedChildren.push(childHtml);
    }
  }

  const childrenHtml = renderedChildren.join("\n");
  const ssrResult = ssrRender(
    litHtml`<owb-section .settings=${settings}></owb-section>`,
  );
  const sectionHtml = await collectResult(ssrResult);
  const sectionInsert = sectionHtml.lastIndexOf("</owb-section>");
  return sectionInsert >= 0
    ? sectionHtml.slice(0, sectionInsert) + childrenHtml + "</owb-section>"
    : sectionHtml + childrenHtml;
}

async function renderContainer(node, context) {
  const settings = node?.settings ?? {};
  const alignmentMode = String(settings.settingAlignmentMode || "block");
  const isGridMode = alignmentMode === "grid" || alignmentMode === "visual";
  const children = Array.isArray(node?.content) ? node.content : [];
  const renderedChildren = [];

  for (const child of children) {
    const childHtml = await renderNode(child, context);
    if (!childHtml) continue;

    if (isGridMode) {
      const style = getGridItemStyle(child?.settings ?? {});
      renderedChildren.push(
        `<div style="${escapeAttr(style)}">${childHtml}</div>`,
      );
    } else {
      renderedChildren.push(childHtml);
    }
  }

  const childrenHtml = renderedChildren.join("\n");
  const ssrResult = ssrRender(
    litHtml`<owb-container .settings=${settings}></owb-container>`,
  );
  const containerHtml = await collectResult(ssrResult);
  const containerInsert = containerHtml.lastIndexOf("</owb-container>");
  return containerInsert >= 0
    ? containerHtml.slice(0, containerInsert) +
        childrenHtml +
        "</owb-container>"
    : containerHtml + childrenHtml;
}

async function renderCollectionContent(node, context) {
  const items = Array.isArray(context?.collectionItemContent)
    ? context.collectionItemContent
    : [];

  if (items.length === 0) {
    return `<owb-collection-content></owb-collection-content>`;
  }

  return await renderNodes(items, context);
}

async function renderCollection(node, context) {
  const settings = node?.settings ?? {};
  const collectionId = String(settings.settingCollectionId || "").trim();
  if (!collectionId) {
    context.warnings.push(
      "Collection component is missing settingCollectionId",
    );
    return "";
  }

  const templateNode = Array.isArray(node?.content) ? node.content[0] : null;
  if (!templateNode || typeof templateNode !== "object") {
    context.warnings.push(
      `Collection component \"${collectionId}\" has no first child template`,
    );
    return "";
  }

  if (
    typeof context.loadCollectionItemsMetadata !== "function" ||
    typeof context.loadCollectionConfig !== "function"
  ) {
    context.warnings.push(
      `Collection loaders are missing for component \"${collectionId}\"`,
    );
    return "";
  }

  const metadataResult =
    await context.loadCollectionItemsMetadata(collectionId);
  const collectionConfig = await context.loadCollectionConfig(collectionId);

  const items = Array.isArray(metadataResult?.items)
    ? metadataResult.items
    : [];
  const allowlist = Array.isArray(collectionConfig?.collectionMetadataAllowlist)
    ? collectionConfig.collectionMetadataAllowlist
    : [];

  const sortMode = String(settings.settingCollectionSort || "disk");
  const sortedItems = getSortedCollectionItems(items, sortMode);
  const limitRaw = String(settings.settingCollectionItemsCount || "all").trim();
  const limit =
    limitRaw === "all"
      ? sortedItems.length
      : Math.max(0, Number.parseInt(limitRaw, 10) || 0);

  const selectedItems = sortedItems.slice(0, limit);
  const renderedChildren = [];

  for (const item of selectedItems) {
    const tokenValues = getTokenValueMap(item?.metadata || {}, allowlist);

    const childHtml = await renderNode(templateNode, {
      ...context,
      tokenValues,
    });

    if (childHtml) {
      renderedChildren.push(childHtml);
    }
  }

  const childrenHtml = renderedChildren.join("\n");
  const ssrResult = ssrRender(
    litHtml`<owb-container .settings=${settings}></owb-container>`,
  );
  const containerHtml = await collectResult(ssrResult);
  const containerInsert = containerHtml.lastIndexOf("</owb-container>");
  return containerInsert >= 0
    ? containerHtml.slice(0, containerInsert) +
        childrenHtml +
        "</owb-container>"
    : containerHtml + childrenHtml;
}

async function renderForm(node, context) {
  const settings = node?.settings ?? {};
  const alignmentMode = String(settings.settingAlignmentMode || "block");
  const isGridMode = alignmentMode === "grid" || alignmentMode === "visual";
  const children = Array.isArray(node?.content) ? node.content : [];
  const renderedChildren = [];

  for (const child of children) {
    const childHtml = await renderNode(child, context);
    if (!childHtml) continue;

    if (isGridMode) {
      const style = getGridItemStyle(child?.settings ?? {});
      renderedChildren.push(
        `<div style="${escapeAttr(style)}">${childHtml}</div>`,
      );
    } else {
      renderedChildren.push(childHtml);
    }
  }

  const childrenHtml = renderedChildren.join("\n");
  const ssrResult = ssrRender(
    litHtml`<owb-form .settings=${settings}></owb-form>`,
  );
  const formHtml = await collectResult(ssrResult);
  const formInsert = formHtml.lastIndexOf("</owb-form>");
  return formInsert >= 0
    ? formHtml.slice(0, formInsert) + childrenHtml + "</owb-form>"
    : formHtml + childrenHtml;
}

function renderInput(node) {
  const s = node?.settings ?? {};
  return `<owb-input>${configScript({
    fieldType: s.settingFieldType ?? s.fieldType ?? "text",
    label: s.settingLabel ?? s.label ?? "",
    name: s.settingName ?? s.name ?? "",
    required: s.settingRequired ?? s.required ?? false,
    placeholder: s.settingPlaceholder ?? s.placeholder ?? "",
    min: s.settingMin ?? s.min ?? "",
    max: s.settingMax ?? s.max ?? "",
    step: s.settingStep ?? s.step ?? "",
    rows: s.settingRows ?? s.rows ?? "4",
    minLength: s.settingMinLength ?? s.minLength ?? "",
    maxLength: s.settingMaxLength ?? s.maxLength ?? "",
    pattern: s.settingPattern ?? s.pattern ?? "",
    customCss: s.settingCustomCss ?? s.customCss ?? "",
  })}</owb-input>`;
}

function renderCaptcha(node) {
  const s = node?.settings ?? {};
  return `<owb-captcha>${configScript({
    captchaChallengeUrl:
      s.settingCaptchaChallengeUrl ?? s.captchaChallengeUrl ?? "",
  })}</owb-captcha>`;
}

function renderCheckbox(node) {
  const s = node?.settings ?? {};
  return `<owb-checkbox>${configScript({
    checkboxLabel: s.settingCheckboxLabel ?? s.checkboxLabel ?? "",
    checkboxName: s.settingCheckboxName ?? s.checkboxName ?? "",
    checkboxValue: s.settingCheckboxValue ?? s.checkboxValue ?? "",
    checkboxDefaultChecked:
      s.settingCheckboxDefaultChecked ?? s.checkboxDefaultChecked ?? false,
    checkboxRequired: s.settingCheckboxRequired ?? s.checkboxRequired ?? false,
  })}</owb-checkbox>`;
}

async function renderNode(node, context) {
  if (!node || typeof node !== "object") return "";

  switch (node.type) {
    case "text":
      return await renderText(node, context);
    case "image":
      return await renderImage(node, context);
    case "button":
      return await renderButton(node, context);
    case "embed":
      return await renderEmbed(node, context);
    case "social-media":
      return await renderSocialMedia(node, context);
    case "gallery":
      return await renderGallery(node, context);
    case "slider":
      return await renderSlider(node, context);
    case "navbar":
      return await renderNavbar(node, context);
    case "shared":
      return await renderShared(node, context);
    case "section":
      return await renderSection(node, context);
    case "container":
      return await renderContainer(node, context);
    case "collection":
      return await renderCollection(node, context);
    case "collection-content":
      return await renderCollectionContent(node, context);
    case "form":
      return await renderForm(node, context);
    case "input":
      return renderInput(node);
    case "captcha":
      return renderCaptcha(node);
    case "checkbox":
      return renderCheckbox(node);
    default:
      context.warnings.push(
        `Unsupported node type: ${String(node.type || "unknown")}`,
      );
      return "";
  }
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
