import * as simpleIcons from "simple-icons";

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

function renderText(node) {
  return `<owb-text>${configScript({ content: node?.content ?? "", settings: node?.settings ?? {} })}</owb-text>`;
}

function renderImage(node) {
  return `<owb-image>${configScript({ url: node?.url ?? "", settings: node?.settings ?? {} })}</owb-image>`;
}

function renderButton(node) {
  return `<owb-button>${configScript({ content: node?.content ?? "Button", settings: node?.settings ?? {} })}</owb-button>`;
}

function renderEmbed(node) {
  return `<owb-embed>${configScript({ html: node?.html ?? "" })}</owb-embed>`;
}

function renderSocialMedia(node) {
  const items = Array.isArray(node?.items)
    ? node.items.map((item) => {
        const normalizedIconSlug = normalizeIconSlug(item?.icon);
        const icon = normalizedIconSlug
          ? SIMPLE_ICON_MAP.get(normalizedIconSlug)
          : null;

        return {
          ...(item && typeof item === "object" ? item : {}),
          icon: normalizedIconSlug,
          iconSvg: icon?.svg || "",
          iconHex: icon?.hex || "",
          iconTitle: icon?.title || "",
        };
      })
    : [];

  return `<owb-social-media>${configScript({ items, settings: node?.settings ?? {} })}</owb-social-media>`;
}

function renderGallery(node) {
  const settings = node?.settings ?? {};
  return `<owb-gallery>${configScript({
    images: node?.images ?? [],
    columns: Number.parseInt(settings.galleryColumns, 10) || 3,
    format: String(settings.galleryFormat || "1 / 1"),
    gap: String(settings.galleryGap || "8px"),
  })}</owb-gallery>`;
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

  return `<owb-section>\n${configScript(settings)}\n${renderedChildren.join("\n")}\n</owb-section>`;
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

  return `<owb-container>\n${configScript(settings)}\n${renderedChildren.join("\n")}\n</owb-container>`;
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

  return `<owb-form>\n${configScript(settings)}\n${renderedChildren.join("\n")}\n</owb-form>`;
}

function renderInput(node) {
  return `<owb-input>${configScript({ settings: node?.settings ?? {} })}</owb-input>`;
}

async function renderNode(node, context) {
  if (!node || typeof node !== "object") return "";

  switch (node.type) {
    case "text":
      return renderText(node);
    case "image":
      return renderImage(node);
    case "button":
      return renderButton(node);
    case "embed":
      return renderEmbed(node);
    case "social-media":
      return renderSocialMedia(node);
    case "gallery":
      return renderGallery(node);
    case "shared":
      return await renderShared(node, context);
    case "section":
      return await renderSection(node, context);
    case "container":
      return await renderContainer(node, context);
    case "form":
      return await renderForm(node, context);
    case "input":
      return renderInput(node);
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
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="https://use.typekit.net/fsb3crk.css" />
    <link rel="stylesheet" href="./theme.css" />
    <link rel="stylesheet" href="./base.css" />
  </head>
  <body>
    <div class="website">
      ${bodyHtml}
    </div>
    <script type="module" src="./publish-runtime.js"></script>
  </body>
</html>`;
}

export async function generatePageHtml({ pageConfig, loadSharedComponent }) {
  const warnings = [];
  const context = {
    warnings,
    loadSharedComponent,
    sharedStack: new Set(),
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
