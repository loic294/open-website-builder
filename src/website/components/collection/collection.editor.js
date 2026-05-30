import { html, unsafeCSS } from "lit";
import { dataLayer } from "../../../editor/data/data-layer.js";
import { OwbLayoutContainerEditor } from "../site-section/site-section.js";
import sectionStyles from "../site-section/styles.css?inline";
import { OwbCollection } from "./collection.js";

export { defaultCollectionConfig } from "./collection.js";

OwbCollection.editorPlugin = {};

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

class OwbCollectionEditor extends OwbLayoutContainerEditor {
  static properties = {
    ...super.properties,
    collectionOptions: { type: Array, state: true },
    collectionItemsMetadata: { type: Array, state: true },
    collectionMetadataAllowlist: { type: Array, state: true },
    settingCollectionId: { type: String },
    settingCollectionItemsCount: { type: String },
    settingCollectionSort: { type: String },
  };

  static styles = [super.styles, unsafeCSS(sectionStyles)];

  constructor() {
    super();
    this.collectionOptions = [];
    this.collectionItemsMetadata = [];
    this.collectionMetadataAllowlist = [];
    this.settingCollectionId = "";
    this.settingCollectionItemsCount = "all";
    this.settingCollectionSort = "disk";
    this.onCollectionPointerDownCapture =
      this.onCollectionPointerDownCapture.bind(this);
  }

  getDefaultSettingsState() {
    return {
      ...super.getDefaultSettingsState(),
      settingCollectionId: "",
      settingCollectionItemsCount: "all",
      settingCollectionSort: "disk",
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("pointerdown", this.onCollectionPointerDownCapture, {
      capture: true,
    });
    void this.loadCollectionOptions();
  }

  disconnectedCallback() {
    this.removeEventListener(
      "pointerdown",
      this.onCollectionPointerDownCapture,
      {
        capture: true,
      },
    );
    super.disconnectedCallback();
  }

  shouldForceCollectionEditingFromEvent(event) {
    if (this.isSettingsEditorOpen) {
      return false;
    }

    const path = event.composedPath();
    for (const node of path) {
      if (!(node instanceof Element)) {
        continue;
      }

      if (node === this) {
        break;
      }

      if (
        node.hasAttribute("data-editor-block") ||
        node.hasAttribute("data-grid-child-id")
      ) {
        return true;
      }

      const tagName = String(node.tagName || "").toLowerCase();
      if (
        (tagName.startsWith("owb-") || tagName.startsWith("site-")) &&
        tagName !== "owb-collection-editor" &&
        tagName !== "owb-collection"
      ) {
        return true;
      }
    }

    return false;
  }

  onCollectionPointerDownCapture(event) {
    if (!this.shouldForceCollectionEditingFromEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void this.openSectionSettings();
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    if (changedProperties.has("settingCollectionId")) {
      void this.loadCollectionMetadata();
    }
  }

  async loadCollectionOptions() {
    try {
      const collections = await dataLayer.listCollections();
      this.collectionOptions = Array.isArray(collections)
        ? collections.map((collection) => ({
            label: collection?.title || collection?.id || "Collection",
            value: collection?.id || "",
          }))
        : [];
    } catch (error) {
      console.error(error);
      this.collectionOptions = [];
    }
  }

  async loadCollectionMetadata() {
    const collectionId = String(this.settingCollectionId || "").trim();
    if (!collectionId) {
      this.collectionItemsMetadata = [];
      this.collectionMetadataAllowlist = [];
      return;
    }

    try {
      const [metadataResult, configResult] = await Promise.all([
        dataLayer.getCollectionItemsMetadata(collectionId),
        dataLayer.getCollectionConfig(collectionId),
      ]);

      this.collectionItemsMetadata = Array.isArray(metadataResult?.items)
        ? metadataResult.items
        : [];
      this.collectionMetadataAllowlist = Array.isArray(
        configResult?.collectionMetadataAllowlist,
      )
        ? configResult.collectionMetadataAllowlist
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        : [];
    } catch (error) {
      console.error(error);
      this.collectionItemsMetadata = [];
      this.collectionMetadataAllowlist = [];
    }
  }

  getSortedItems(items = this.collectionItemsMetadata) {
    const sortMode = String(this.settingCollectionSort || "disk");
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

  getTokenMap(metadata = {}) {
    const allowlist = Array.isArray(this.collectionMetadataAllowlist)
      ? this.collectionMetadataAllowlist
      : [];
    const dynamicFields = [...new Set([...BASE_DYNAMIC_FIELDS, ...allowlist])];
    const tokenMap = {};

    for (const fieldName of dynamicFields) {
      const normalizedFieldName = String(fieldName || "").trim();
      if (!normalizedFieldName) {
        continue;
      }

      const value =
        metadata?.[normalizedFieldName] ??
        getValueByPath(metadata?.metadata, normalizedFieldName) ??
        getValueByPath(metadata, normalizedFieldName);

      if (
        normalizedFieldName === "url" ||
        normalizedFieldName === "sourceUrl"
      ) {
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

      if (value === undefined || value === null) {
        continue;
      }

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

  getAvailableDynamicFields() {
    const allowlist = Array.isArray(this.collectionMetadataAllowlist)
      ? this.collectionMetadataAllowlist
      : [];

    const sampleMetadata =
      this.collectionItemsMetadata[0]?.metadata &&
      typeof this.collectionItemsMetadata[0].metadata === "object"
        ? this.collectionItemsMetadata[0].metadata
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

  getCollectionRenderedChildNodes() {
    const childNodes = super.getChildNodes();
    if (!Array.isArray(childNodes) || childNodes.length === 0) {
      return [];
    }

    const isSettingsFocused = this.isSettingsEditorOpen;
    if (isSettingsFocused) {
      return [childNodes[0]];
    }

    const firstChildTemplate = childNodes[0];
    const sortedItems = this.getSortedItems();
    const limitRaw = String(this.settingCollectionItemsCount || "all").trim();
    const limit =
      limitRaw === "all"
        ? sortedItems.length
        : Math.max(0, Number.parseInt(limitRaw, 10) || 0);
    const selectedItems = sortedItems.slice(0, limit);

    return selectedItems.map((item, index) => {
      const tokenMap = this.getTokenMap(item?.metadata || {});
      const clonedTemplate = cloneNodeWithIdSuffix(
        firstChildTemplate,
        `collection-${index + 1}`,
      );

      return applyTokensRecursively(clonedTemplate, tokenMap);
    });
  }

  getChildNodes() {
    return this.getCollectionRenderedChildNodes();
  }

  renderGeneralSettingsExtras() {
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

    const dynamicFields = this.getAvailableDynamicFields();

    return html`
      ${super.renderGeneralSettingsExtras()}
      <settings-section title="Collection">
        <editor-select
          label="Collection"
          .options=${this.collectionOptions.length > 0
            ? this.collectionOptions
            : [{ label: "No collections available", value: "" }]}
          .value=${this.settingCollectionId}
          @change=${(event) => {
            this.settings.updateSettingsState({
              settingCollectionId: event.detail.value,
            });
          }}
        ></editor-select>
        <editor-select
          label="Number of items"
          .options=${countOptions}
          .value=${this.settingCollectionItemsCount}
          @change=${(event) => {
            this.settings.updateSettingsState({
              settingCollectionItemsCount: event.detail.value,
            });
          }}
        ></editor-select>
        <editor-select
          label="Sort"
          .options=${COLLECTION_SORT_OPTIONS}
          .value=${this.settingCollectionSort}
          @change=${(event) => {
            this.settings.updateSettingsState({
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
  }
}

export const editorRenderCollection = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-collection-editor
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-collection-editor>`;
};

if (!customElements.get("owb-collection-editor")) {
  customElements.define("owb-collection-editor", OwbCollectionEditor);
}
