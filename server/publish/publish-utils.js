import { render as ssrRender } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";

export function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function configScript(obj) {
  return `<script type="application/json" data-owb-config>${JSON.stringify(obj)}</script>`;
}

export async function ssrRenderToString(template) {
  return await collectResult(ssrRender(template));
}

export function insertChildrenBefore(html, closingTag, childrenHtml) {
  const insertIndex = html.lastIndexOf(closingTag);
  return insertIndex >= 0
    ? html.slice(0, insertIndex) + childrenHtml + closingTag
    : html + childrenHtml;
}

export const BASE_DYNAMIC_FIELDS = [
  "title",
  "excerpt",
  "tags",
  "url",
  "featuredImageUrl",
  "publishedAt",
  "categories",
];

const IMPORT_REFERENCE_FIELDS = new Set(["sourceUrl", "slug"]);

export function replaceTemplateTokens(value, tokenValues = {}) {
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

export function applyTokensToJson(value, tokenValues = {}) {
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

export function getValueByPath(value, path) {
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

export function normalizePathTokenValue(value) {
  return String(value || "")
    .trim()
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function getTokenValueMap(metadata = {}, allowlist = []) {
  const tokenValues = {};
  const dynamicFields = [...new Set([...BASE_DYNAMIC_FIELDS, ...allowlist])];

  for (const fieldName of dynamicFields) {
    const normalized = String(fieldName || "").trim();
    if (!normalized || IMPORT_REFERENCE_FIELDS.has(normalized)) {
      continue;
    }

    const value =
      metadata?.[normalized] ??
      getValueByPath(metadata?.metadata, normalized) ??
      getValueByPath(metadata, normalized);

    if (normalized === "url") {
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

export function getSortedCollectionItems(items = [], sortMode = "disk") {
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

export function getGridItemStyle(settings = {}) {
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

export async function renderChildrenWithGrid(node, context) {
  const settings = node?.settings ?? {};
  const alignmentMode = String(settings.settingAlignmentMode || "block");
  const isGridMode = alignmentMode === "grid" || alignmentMode === "visual";
  const children = Array.isArray(node?.content) ? node.content : [];
  const renderedChildren = [];

  for (const child of children) {
    const childHtml = await context.renderNode(child, context);
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

  return renderedChildren.join("\n");
}
