import { html, unsafeCSS } from "lit";
import { dataLayer } from "../../../editor/data/data-layer.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";
import { OwbCollection } from "./collection.js";
import {
  LayoutEditorController,
  registerLayoutEditorProperties,
} from "../site-section/layout-editor-controller.js";

export { defaultCollectionConfig } from "./collection.js";

const COLLECTION_SORT_OPTIONS = [
  { label: "Disk order", value: "disk" },
  { label: "Title A-Z", value: "title-asc" },
  { label: "Title Z-A", value: "title-desc" },
  { label: "Id A-Z", value: "id-asc" },
  { label: "Id Z-A", value: "id-desc" },
  { label: "Date newest first", value: "publishedAt-desc" },
  { label: "Date oldest first", value: "publishedAt-asc" },
];

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

const COLLECTION_DEFAULTS = {
  settingCollectionId: "",
  settingCollectionItemsCount: "all",
  settingCollectionSort: "disk",
};

function normalizePathTokenValue(value) {
  return String(value || "")
    .trim()
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
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

function flattenObjectPaths(value, prefix = "") {
  if (!value || typeof value !== "object") {
    return [];
  }

  const paths = [];
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      continue;
    }

    const path = prefix ? `${prefix}.${normalizedKey}` : normalizedKey;
    if (
      Array.isArray(nested) ||
      typeof nested !== "object" ||
      nested === null
    ) {
      paths.push(path);
      continue;
    }

    paths.push(...flattenObjectPaths(nested, path));
  }

  return paths;
}

function replaceTokensInString(value, tokenMap) {
  return String(value ?? "").replace(
    /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g,
    (_m, key) => {
      const exact = tokenMap[key];
      if (typeof exact === "string") {
        return exact;
      }

      const upper = tokenMap[String(key || "").toUpperCase()];
      return typeof upper === "string" ? upper : "";
    },
  );
}

function applyTokensRecursively(value, tokenMap) {
  if (typeof value === "string") {
    return replaceTokensInString(value, tokenMap);
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyTokensRecursively(item, tokenMap));
  }

  if (value && typeof value === "object") {
    const next = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      next[key] = applyTokensRecursively(nestedValue, tokenMap);
    }
    return next;
  }

  return value;
}

function cloneNodeWithIdSuffix(node, suffix) {
  if (Array.isArray(node)) {
    return node.map((child) => cloneNodeWithIdSuffix(child, suffix));
  }

  if (!node || typeof node !== "object") {
    return node;
  }

  const cloned = { ...node };
  if (typeof cloned.id === "string" && cloned.id.trim()) {
    cloned.id = `${cloned.id}-${suffix}`;
  }

  for (const key of Object.keys(cloned)) {
    cloned[key] = cloneNodeWithIdSuffix(cloned[key], suffix);
  }

  return cloned;
}

function getRawTemplateChildren(host) {
  return Array.isArray(host.node?.content) ? host.node.content : [];
}

function getSortedItems(host) {
  const items = Array.isArray(host.collectionItemsMetadata)
    ? host.collectionItemsMetadata
    : [];
  const sortMode = String(host.settingCollectionSort || "disk");
  const nextItems = [...items];

  if (sortMode === "title-asc") {
    nextItems.sort((a, b) =>
      String(a?.title || "").localeCompare(String(b?.title || "")),
    );
    return nextItems;
  }
  if (sortMode === "title-desc") {
    nextItems.sort((a, b) =>
      String(b?.title || "").localeCompare(String(a?.title || "")),
    );
    return nextItems;
  }
  if (sortMode === "id-asc") {
    nextItems.sort((a, b) =>
      String(a?.id || "").localeCompare(String(b?.id || "")),
    );
    return nextItems;
  }
  if (sortMode === "id-desc") {
    nextItems.sort((a, b) =>
      String(b?.id || "").localeCompare(String(a?.id || "")),
    );
    return nextItems;
  }
  if (sortMode === "publishedAt-desc") {
    nextItems.sort(
      (a, b) =>
        new Date(b?.metadata?.metadata?.publishedAt || 0).getTime() -
        new Date(a?.metadata?.metadata?.publishedAt || 0).getTime(),
    );
    return nextItems;
  }
  if (sortMode === "publishedAt-asc") {
    nextItems.sort(
      (a, b) =>
        new Date(a?.metadata?.metadata?.publishedAt || 0).getTime() -
        new Date(b?.metadata?.metadata?.publishedAt || 0).getTime(),
    );
    return nextItems;
  }
  return nextItems;
}

function getTokenMap(host, metadata = {}) {
  const allowlist = Array.isArray(host.collectionMetadataAllowlist)
    ? host.collectionMetadataAllowlist
    : [];
  const dynamicFields = [...new Set([...BASE_DYNAMIC_FIELDS, ...allowlist])];
  const tokenMap = {};

  for (const fieldName of dynamicFields) {
    const normalizedFieldName = String(fieldName || "").trim();
    if (!normalizedFieldName) continue;

    const value =
      metadata?.[normalizedFieldName] ??
      getValueByPath(metadata?.metadata, normalizedFieldName) ??
      getValueByPath(metadata, normalizedFieldName);

    if (normalizedFieldName === "url" || normalizedFieldName === "sourceUrl") {
      const pathValue = normalizePathTokenValue(value);
      if (pathValue) {
        tokenMap[normalizedFieldName] = pathValue;
        tokenMap[normalizedFieldName.toUpperCase()] = pathValue;
      }
      continue;
    }

    if (Array.isArray(value)) {
      const joined = value.map((item) => String(item || "")).join(", ");
      tokenMap[normalizedFieldName] = joined;
      tokenMap[normalizedFieldName.toUpperCase()] = joined;
      continue;
    }

    if (value === undefined || value === null) continue;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      tokenMap[normalizedFieldName] = String(value);
      tokenMap[normalizedFieldName.toUpperCase()] = String(value);
    }
  }

  return tokenMap;
}

function getAvailableDynamicFields(host) {
  const allowlist = Array.isArray(host.collectionMetadataAllowlist)
    ? host.collectionMetadataAllowlist
    : [];

  const sampleMetadata =
    host.collectionItemsMetadata?.[0]?.metadata &&
    typeof host.collectionItemsMetadata[0].metadata === "object"
      ? host.collectionItemsMetadata[0].metadata
      : {};
  const discoveredMetadataPaths = flattenObjectPaths(
    sampleMetadata?.metadata || {},
  ).sort((a, b) => a.localeCompare(b));

  return [
    ...new Set([
      ...BASE_DYNAMIC_FIELDS,
      ...allowlist,
      ...discoveredMetadataPaths,
    ]),
  ];
}

async function loadCollectionOptions(host) {
  try {
    const collections = await dataLayer.listCollections();
    host.collectionOptions = Array.isArray(collections)
      ? collections.map((collection) => ({
          label: collection?.title || collection?.id || "Collection",
          value: collection?.id || "",
        }))
      : [];
  } catch (error) {
    console.error(error);
    host.collectionOptions = [];
  }
}

async function loadCollectionMetadata(host) {
  const collectionId = String(host.settingCollectionId || "").trim();
  if (!collectionId) {
    host.collectionItemsMetadata = [];
    host.collectionMetadataAllowlist = [];
    return;
  }

  try {
    const [metadataResult, configResult] = await Promise.all([
      dataLayer.getCollectionItemsMetadata(collectionId),
      dataLayer.getCollectionConfig(collectionId),
    ]);

    host.collectionItemsMetadata = Array.isArray(metadataResult?.items)
      ? metadataResult.items
      : [];
    host.collectionMetadataAllowlist = Array.isArray(
      configResult?.collectionMetadataAllowlist,
    )
      ? configResult.collectionMetadataAllowlist
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [];
  } catch (error) {
    console.error(error);
    host.collectionItemsMetadata = [];
    host.collectionMetadataAllowlist = [];
  }
}

function shouldForceCollectionEditingFromEvent(host, event) {
  if (host.isSettingsEditorOpen) return false;

  const path = event.composedPath();
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node === host) break;

    if (
      node.hasAttribute("data-editor-block") ||
      node.hasAttribute("data-grid-child-id")
    ) {
      return true;
    }

    const tagName = String(node.tagName || "").toLowerCase();
    if (
      (tagName.startsWith("owb-") || tagName.startsWith("site-")) &&
      tagName !== "owb-collection"
    ) {
      return true;
    }
  }

  return false;
}

registerLayoutEditorProperties(OwbCollection, {
  collectionOptions: { type: Array, state: true },
  collectionItemsMetadata: { type: Array, state: true },
  collectionMetadataAllowlist: { type: Array, state: true },
  settingCollectionId: { type: String },
  settingCollectionItemsCount: { type: String },
  settingCollectionSort: { type: String },
});

const existingStyles = Array.isArray(OwbCollection.styles)
  ? OwbCollection.styles
  : [OwbCollection.styles];
OwbCollection.styles = [...existingStyles, unsafeCSS(blocksStyles)];

const COLLECTION_VARIANT_CONFIG = {
  variant: "collection",
  getDefaultSettingsStateExtras() {
    return { ...COLLECTION_DEFAULTS };
  },
  onVariantConnected(controller) {
    const host = controller.host;
    if (host.collectionOptions === undefined) host.collectionOptions = [];
    if (host.collectionItemsMetadata === undefined)
      host.collectionItemsMetadata = [];
    if (host.collectionMetadataAllowlist === undefined)
      host.collectionMetadataAllowlist = [];
    for (const [key, value] of Object.entries(COLLECTION_DEFAULTS)) {
      if (host[key] === undefined) host[key] = value;
    }

    if (!controller._collectionPointerListener) {
      controller._collectionPointerListener = (event) => {
        if (!shouldForceCollectionEditingFromEvent(host, event)) return;
        event.preventDefault();
        event.stopPropagation();
        void controller.openSectionSettings();
      };
      host.addEventListener(
        "pointerdown",
        controller._collectionPointerListener,
        { capture: true },
      );
    }

    void loadCollectionOptions(host);
  },
  onVariantUpdated(controller, changedProperties) {
    if (changedProperties.has("settingCollectionId")) {
      void loadCollectionMetadata(controller.host);
    }
  },
  onVariantDisconnected(controller) {
    if (controller._collectionPointerListener) {
      controller.host.removeEventListener(
        "pointerdown",
        controller._collectionPointerListener,
        { capture: true },
      );
      controller._collectionPointerListener = null;
    }
  },
  getRenderedChildNodes(controller) {
    const host = controller.host;
    const templateChildren = getRawTemplateChildren(host);
    if (templateChildren.length === 0) return [];

    if (host.isSettingsEditorOpen) {
      return [templateChildren[0]];
    }

    const firstChildTemplate = templateChildren[0];
    const sortedItems = getSortedItems(host);
    const limitRaw = String(host.settingCollectionItemsCount || "all").trim();
    const limit =
      limitRaw === "all"
        ? sortedItems.length
        : Math.max(0, Number.parseInt(limitRaw, 10) || 0);
    const selectedItems = sortedItems.slice(0, limit);

    return selectedItems.map((item, index) => {
      const tokenMap = getTokenMap(host, item?.metadata || {});
      const clonedTemplate = cloneNodeWithIdSuffix(
        firstChildTemplate,
        `collection-${index + 1}`,
      );
      return applyTokensRecursively(clonedTemplate, tokenMap);
    });
  },
  renderGeneralSettingsExtras(controller) {
    const host = controller.host;
    const countOptions = [
      { label: "All", value: "all" },
      { label: "1", value: "1" },
      { label: "2", value: "2" },
      { label: "3", value: "3" },
      { label: "4", value: "4" },
      { label: "6", value: "6" },
      { label: "8", value: "8" },
      { label: "12", value: "12" },
    ];

    const dynamicFields = getAvailableDynamicFields(host);
    const options = Array.isArray(host.collectionOptions)
      ? host.collectionOptions
      : [];

    return html`
      <settings-section title="Collection">
        <editor-select
          label="Collection"
          .options=${options.length > 0
            ? options
            : [{ label: "No collections available", value: "" }]}
          .value=${host.settingCollectionId}
          @change=${(event) => {
            host.settings.updateSettingsState({
              settingCollectionId: event.detail.value,
            });
          }}
        ></editor-select>
        <editor-select
          label="Number of items"
          .options=${countOptions}
          .value=${host.settingCollectionItemsCount}
          @change=${(event) => {
            host.settings.updateSettingsState({
              settingCollectionItemsCount: event.detail.value,
            });
          }}
        ></editor-select>
        <editor-select
          label="Sort"
          .options=${COLLECTION_SORT_OPTIONS}
          .value=${host.settingCollectionSort}
          @change=${(event) => {
            host.settings.updateSettingsState({
              settingCollectionSort: event.detail.value,
            });
          }}
        ></editor-select>
        <div class="settings-css-help">
          Available dynamic fields:
          ${dynamicFields.length > 0
            ? dynamicFields.map((fieldName) => `{{${fieldName}}}`).join(", ")
            : "None"}
        </div>
      </settings-section>
    `;
  },
};

OwbCollection.editorPlugin = {
  onConnected(host) {
    if (!host._layoutEditor) {
      host._layoutEditor = new LayoutEditorController(
        host,
        COLLECTION_VARIANT_CONFIG,
      );
    }
    host._layoutEditor.onConnected();
  },
  onWillUpdate(host, changedProperties) {
    host._layoutEditor?.onWillUpdate(changedProperties);
  },
  onUpdated(host, changedProperties) {
    host._layoutEditor?.onUpdated(changedProperties);
  },
  onDisconnected(host) {
    host._layoutEditor?.onDisconnected();
    host._layoutEditor = null;
  },
  render(host) {
    return host._layoutEditor?.render() ?? html``;
  },
};

export const editorRenderCollection = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-collection
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-collection>`;
};
